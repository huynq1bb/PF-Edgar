import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { parseProductInput, type ProductPreview } from "../cross-sell.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const productInput = url.searchParams.get("product");
  if (!productInput) {
    return Response.json({ product: null }, { status: 400 });
  }

  const parsed = parseProductInput(productInput);
  if (!parsed) {
    return Response.json({ product: null }, { status: 400 });
  }

  try {
    // GID hoặc ID số → gọi Shopify Admin GraphQL: product(id: $id)
    if (parsed.type === "gid") {
      const res = await admin.graphql(
        `query getProduct($id: ID!) {
          product(id: $id) {
            id
            title
            handle
            descriptionHtml
            featuredImage { url }
          }
        }`,
        { variables: { id: parsed.value } },
      );
      const json = (await res.json()) as {
        data?: { product?: { id: string; title: string; handle: string; descriptionHtml?: string; featuredImage?: { url: string } | null } };
      };
      const p = json.data?.product;
      if (!p) return Response.json({ product: null });
      const preview: ProductPreview = {
        id: p.id,
        title: p.title,
        handle: p.handle,
        description: stripHtml(p.descriptionHtml || ""),
        imageUrl: (p.featuredImage && p.featuredImage.url) || null,
      };
      return Response.json({ product: preview });
    }

    // Handle hoặc link → gọi Shopify Admin GraphQL: products(query: "handle:...")
    const res = await admin.graphql(
      `query getProductByHandle($query: String!) {
        products(first: 1, query: $query) {
          edges {
            node {
              id
              title
              handle
              descriptionHtml
              featuredImage { url }
            }
          }
        }
      }`,
      { variables: { query: `handle:${parsed.value}` } },
    );
    const json = (await res.json()) as {
      data?: {
        products?: { edges: { node: { id: string; title: string; handle: string; descriptionHtml?: string; featuredImage?: { url: string } | null } }[] };
      };
    };
    const node = json.data?.products?.edges?.[0]?.node;
    if (!node) return Response.json({ product: null });
    const preview: ProductPreview = {
      id: node.id,
      title: node.title,
      handle: node.handle,
      description: stripHtml(node.descriptionHtml || ""),
      imageUrl: (node.featuredImage && node.featuredImage.url) || null,
    };
    return Response.json({ product: preview });
  } catch {
    return Response.json({ product: null }, { status: 200 });
  }
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
}

export default function ProductPreviewRoute() {
  return null;
}
