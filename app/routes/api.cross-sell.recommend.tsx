import type { LoaderFunctionArgs } from "react-router";
import { getRecommendations } from "../cross-sell.server";

/**
 * Public API for storefront: GET /api/cross-sell/recommend?shop=store.myshopify.com&product_id=gid://shopify/Product/123
 * Returns { productIds: string[] }. Use App Proxy in production to verify request from store.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const productId = url.searchParams.get("product_id");

  const origin = request.headers.get("Origin") ?? "";
  const corsHeaders: Record<string, string> = origin
    ? { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "GET, OPTIONS" }
    : {};

  if (!shop || !productId) {
    return Response.json(
      { error: "Missing shop or product_id" },
      { status: 400, headers: corsHeaders },
    );
  }

  try {
    const { productIds, products } = await getRecommendations(shop, productId);
    return Response.json({ productIds, products }, {
      headers: {
        "Cache-Control": "public, max-age=300",
        ...corsHeaders,
      },
    });
  } catch {
    return Response.json({ productIds: [], products: [] }, { status: 200, headers: corsHeaders });
  }
};

export default function ApiCrossSellRecommend() {
  return null;
}
