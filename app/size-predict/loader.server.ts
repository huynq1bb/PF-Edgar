/**
 * Size prediction admin page loader.
 * Data: settings, rules (with mappings), products, collections.
 */
import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import type { MappingRow } from "./types";
import type { SizePredictLoaderData } from "./types";

export async function sizePredictLoader({ request }: LoaderFunctionArgs): Promise<SizePredictLoaderData> {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;

  const settingsRepo = (prisma as unknown as Record<string, unknown>).sizePredictSettings as
    | undefined
    | {
        findUnique: (args: { where: { shop: string } }) => Promise<{
          widgetEnabled: boolean;
          buttonLabel: string;
          helperText: string;
          heightUnit: string;
          weightUnit: string;
          autoSelectSize: boolean;
        } | null>;
      };
  const rulesRepo = (prisma as unknown as Record<string, unknown>).sizePredictRule as
    | undefined
    | {
        findMany: (args: object) => Promise<
          Array<{
            id: string;
            name: string;
            scopeType: string;
            scopeValue: string | null;
            status: string;
            mappings: Array<MappingRow>;
            createdAt: Date;
          }>
        >;
      };

  const [settings, rules, products, collections, previewProductRaw] = await Promise.all([
    settingsRepo ? settingsRepo.findUnique({ where: { shop } }).catch(() => null) : Promise.resolve(null),
    rulesRepo
      ? rulesRepo.findMany({ where: { shop }, include: { mappings: true }, orderBy: { createdAt: "desc" } }).catch(() => [])
      : Promise.resolve([]),
    admin
      .graphql(
        `#graphql
        query getProducts { products(first: 50) { edges { node { id title } } } }
      `
      )
      .then((r: Response) => r.json())
      .then((j: { data?: { products?: { edges?: Array<{ node: { id: string; title: string } }> } } }) =>
        (j.data?.products?.edges ?? []).map((e) => e.node)
      ),
    admin
      .graphql(
        `#graphql
        query getCollections { collections(first: 50) { edges { node { id title } } } }
      `
      )
      .then((r: Response) => r.json())
      .then((j: { data?: { collections?: { edges?: Array<{ node: { id: string; title: string } }> } } }) =>
        (j.data?.collections?.edges ?? []).map((e) => e.node)
      ),
    admin
      .graphql(
        `#graphql
        query getPreviewProduct($query: String!) {
          products(first: 5, query: $query) {
            edges {
              node {
                id
                title
                handle
                featuredImage {
                  url
                }
                images(first: 10) {
                  edges {
                    node {
                      url
                    }
                  }
                }
                options {
                  name
                  values
                }
                variants(first: 100) {
                  edges {
                    node {
                      id
                      title
                      selectedOptions {
                        name
                        value
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `,
        {
          variables: { query: 'title:"The Collection Snowboard: Liquid"' },
        }
      )
      .then((r: Response) => r.json())
      .then((j: {
        data?: {
          products?: {
            edges?: Array<{
              node: {
                id: string;
                title: string;
                handle: string;
                featuredImage?: { url: string } | null;
                images?: { edges: Array<{ node: { url: string } }> };
                options: Array<{ name: string; values: string[] }>;
                variants: { edges: Array<{ node: { id: string; title: string; selectedOptions: Array<{ name: string; value: string }> } }> };
              };
            }>;
          };
        };
      }) => {
        const edges = j.data?.products?.edges ?? [];
        const node = edges[0]?.node;
        if (!node) return null;
        const variants = (node.variants?.edges ?? []).map((e) => ({
          id: e.node.id,
          title: e.node.title,
          selectedOptions: e.node.selectedOptions ?? [],
        }));
        const images = (node.images?.edges ?? []).map((e) => e.node.url);
        return {
          id: node.id,
          title: node.title,
          handle: node.handle,
          featuredImageUrl: node.featuredImage?.url ?? null,
          images,
          options: node.options ?? [],
          variants,
        };
      })
      .catch(() => null),
  ]);

  return {
    settings: settings
      ? {
          widgetEnabled: settings.widgetEnabled,
          buttonLabel: settings.buttonLabel,
          helperText: settings.helperText,
          heightUnit: settings.heightUnit,
          weightUnit: settings.weightUnit,
          autoSelectSize: settings.autoSelectSize,
        }
      : {
          widgetEnabled: true,
          buttonLabel: "Find my size",
          helperText: "Suggest the best size for you",
          heightUnit: "cm",
          weightUnit: "kg",
          autoSelectSize: true,
        },
    rules: (rules ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      scopeType: r.scopeType,
      scopeValue: r.scopeValue ?? "",
      status: r.status,
      sizes: [...new Set(r.mappings.map((m) => m.sizeName))],
      mappings: r.mappings.map((m) => ({
        sizeName: m.sizeName,
        heightMin: m.heightMin,
        heightMax: m.heightMax,
        weightMin: m.weightMin,
        weightMax: m.weightMax,
      })),
    })),
    products: products ?? [],
    collections: collections ?? [],
    previewProduct: previewProductRaw ?? null,
  };
}
