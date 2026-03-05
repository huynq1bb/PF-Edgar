import type { CrossSellRule } from "@prisma/client";
import prisma from "./db.server";

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes (AC8)
const cache = new Map<string, { at: number; productIds: string[] }>();

function cacheKey(shop: string, productId: string): string {
  return `${shop}:${productId}`;
}

export function getCachedRecommendations(shop: string, productId: string): string[] | null {
  const key = cacheKey(shop, productId);
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.productIds;
}

export function setCachedRecommendations(shop: string, productId: string, productIds: string[]): void {
  cache.set(cacheKey(shop, productId), { at: Date.now(), productIds });
}

export async function getSessionForShop(shop: string): Promise<{ accessToken: string } | null> {
  const session = await prisma.session.findFirst({
    where: { shop },
    orderBy: { id: "asc" },
  });
  return session ? { accessToken: session.accessToken } : null;
}

export interface ProductPreview {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  handle: string;
}

/** Resolve product URL, handle, or numeric ID to GID. Returns GID or null. */
export function parseProductInput(input: string): { type: "gid"; value: string } | { type: "handle"; value: string } | null {
  const trimmed = (input || "").trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("gid://shopify/Product/")) return { type: "gid", value: trimmed };
  if (/^\d+$/.test(trimmed)) return { type: "gid", value: `gid://shopify/Product/${trimmed}` };
  const match = trimmed.match(/\/products\/([^/?#]+)/);
  if (match) return { type: "handle", value: match[1] };
  return { type: "handle", value: trimmed };
}

/** Resolve product input (URL, handle, or GID) to product GID using Admin API. */
export async function resolveProductGid(
  graphql: (query: string, options: { variables?: Record<string, unknown> }) => Promise<Response>,
  input: string,
): Promise<string | null> {
  const parsed = parseProductInput(input);
  if (!parsed) return null;
  if (parsed.type === "gid") return parsed.value;
  try {
    const res = await graphql(
      `query getProductByHandle($query: String!) {
        products(first: 1, query: $query) {
          edges { node { id } }
        }
      }`,
      { variables: { query: `handle:${parsed.value}` } },
    );
    const json = (await res.json()) as { data?: { products?: { edges: { node: { id: string } }[] } } };
    return json.data?.products?.edges?.[0]?.node?.id ?? null;
  } catch {
    return null;
  }
}

/** Returns the highest-priority enabled rule that matches this product (AC7). */
export async function getMatchingRule(shop: string, productGid: string): Promise<CrossSellRule | null> {
  const rules = await prisma.crossSellRule.findMany({
    where: { shop, enabled: true },
    orderBy: { priority: "desc" },
  });
  for (const rule of rules) {
    if (rule.triggerType === "product" && rule.triggerValue === productGid) return rule;
    if (rule.triggerType === "collection") return rule; // show recommendations from this collection
  }
  return null;
}

export interface RecommendedProduct {
  id: string;
  title: string;
  handle: string;
  imageUrl: string | null;
  price: string;
  variantId: string;
}

export interface RecommendationResult {
  productIds: string[];
  products: RecommendedProduct[];
  ruleId: string | null;
}

/**
 * Fetch candidate product IDs from Shopify Admin API and filter by rule.
 * Returns up to rule.maxRecommendations product GIDs (excluding current product).
 */
export async function runRecommendationEngine(
  shop: string,
  productId: string,
  accessToken: string,
  rule: CrossSellRule,
): Promise<string[]> {
  const apiVersion = "2024-10";
  const url = `https://${shop}/admin/api/${apiVersion}/graphql.json`;

  // Candidate source: collection from trigger (when type=collection) or from filter
  const collectionId =
    rule.triggerType === "collection" ? rule.triggerValue : rule.filterCollectionId;

  const limit = Math.min(50, rule.maxRecommendations * 5);

  if (collectionId) {
    const query = `query getCollectionProducts($id: ID!, $first: Int!) {
      collection(id: $id) {
        products(first: $first) {
          edges { node { id } }
        }
      }
    }`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query, variables: { id: collectionId, first: limit } }),
    });
    if (!res.ok) return [];
    const raw = await res.json();
    const collectionProducts =
      raw.data && raw.data.collection && raw.data.collection.products
        ? raw.data.collection.products.edges
        : [];
    const ids = collectionProducts
      .map((e: { node: { id: string } }) => e.node.id)
      .filter((id: string) => id !== productId);
    return ids.slice(0, rule.maxRecommendations);
  }

  const firstTag = rule.filterTags ? rule.filterTags.split(",")[0] : null;
  const tagQuery = firstTag ? `tag:${String(firstTag).trim()}` : null;
  const query = `query getProducts($first: Int!, $query: String) {
    products(first: $first, query: $query) {
      edges { node { id } }
    }
  }`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({
      query,
      variables: { first: limit, query: tagQuery },
    }),
  });
  if (!res.ok) return [];
  const raw2 = await res.json();
  const productEdges =
    raw2.data && raw2.data.products ? raw2.data.products.edges : [];
  const ids = productEdges
    .map((e: { node: { id: string } }) => e.node.id)
    .filter((id: string) => id !== productId);
  return ids.slice(0, rule.maxRecommendations);
}

export async function fetchProductDetails(
  shop: string,
  accessToken: string,
  productIds: string[],
): Promise<RecommendedProduct[]> {
  if (productIds.length === 0) return [];
  const apiVersion = "2024-10";
  const url = `https://${shop}/admin/api/${apiVersion}/graphql.json`;
  const query = `query getProducts($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Product {
        id
        title
        handle
        featuredImage { url }
        variants(first: 1) {
          edges { node { id } }
        }
        priceRangeV2 {
          minVariantPrice { amount }
        }
      }
    }
  }`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({ query, variables: { ids: productIds } }),
  });
  if (!res.ok) return [];
  const body = await res.json();
  const nodes = (body.data && body.data.nodes) || [];
  const out: RecommendedProduct[] = [];
  for (const n of nodes) {
    if (!n || !n.variants || !n.variants.edges || !n.variants.edges[0]) continue;
    out.push({
      id: n.id,
      title: n.title,
      handle: n.handle,
      imageUrl: (n.featuredImage && n.featuredImage.url) || null,
      price: (n.priceRangeV2 && n.priceRangeV2.minVariantPrice && n.priceRangeV2.minVariantPrice.amount) || "0",
      variantId: n.variants.edges[0].node.id,
    });
  }
  return out;
}

export async function getRecommendations(shop: string, productId: string): Promise<RecommendationResult> {
  const cached = getCachedRecommendations(shop, productId);
  if (cached) {
    const session = await getSessionForShop(shop);
    const products = session
      ? await fetchProductDetails(shop, session.accessToken, cached)
      : [];
    return { productIds: cached, products, ruleId: null };
  }

  const session = await getSessionForShop(shop);
  if (!session) return { productIds: [], products: [], ruleId: null };

  const rule = await getMatchingRule(shop, productId);
  if (!rule) return { productIds: [], products: [], ruleId: null };

  let productIds: string[];
  if (rule.suggestedProductId1 || rule.suggestedProductId2 || rule.suggestedProductId3) {
    productIds = [rule.suggestedProductId1, rule.suggestedProductId2, rule.suggestedProductId3].filter(
      (id): id is string => Boolean(id),
    );
    productIds = productIds.filter((id) => id !== productId);
  } else {
    productIds = await runRecommendationEngine(shop, productId, session.accessToken, rule);
  }
  setCachedRecommendations(shop, productId, productIds);

  const products = await fetchProductDetails(shop, session.accessToken, productIds);

  return { productIds, products, ruleId: rule.id };
}
