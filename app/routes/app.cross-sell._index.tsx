import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Link, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const repo = (prisma as unknown as Record<string, unknown>).crossSellRule as { findMany: (args: object) => Promise<unknown[]> } | undefined;
  if (!repo?.findMany) return { rules: [] };
  const rules = await repo.findMany({
    where: { shop: session.shop },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });
  return { rules: rules as Array<{ id: string; name: string; enabled: boolean; triggerValue: string; suggestedProductId1: string | null; suggestedProductId2: string | null; suggestedProductId3: string | null }> };
};

export default function CrossSellIndex() {
  const { rules } = useLoaderData<typeof loader>();

  return (
    <s-page heading="Cross-sell rules">
      <Link to="/app/cross-sell/new" style={{ textDecoration: "none" }}>
        <s-button slot="primary-action" variant="primary">
          Create rule
        </s-button>
      </Link>

      <s-section heading="Rules (often bought together)">
        {rules.length === 0 ? (
          <s-paragraph>
            No rules yet. Create a rule to show recommended products on product pages.
          </s-paragraph>
        ) : (
          <s-stack direction="block" gap="base">
            {rules.map((rule) => (
              <s-box
                key={rule.id}
                padding="base"
                borderWidth="base"
                borderRadius="base"
                background="subdued"
              >
                <s-stack direction="block" gap="tight">
                  <s-stack direction="inline" gap="base">
                    <s-text fontWeight="bold">{rule.name}</s-text>
                    {!rule.enabled && (
                      <s-text tone="subdued">(disabled)</s-text>
                    )}
                  </s-stack>
                  <s-paragraph>
                    Sản phẩm chính: {rule.triggerValue}
                  </s-paragraph>
                  <s-paragraph>
                    Gợi ý: {[rule.suggestedProductId1, rule.suggestedProductId2, rule.suggestedProductId3].filter(Boolean).join(" · ") || "—"}
                  </s-paragraph>
                  <s-stack direction="inline" gap="tight">
                    <Link to={`/app/cross-sell/${rule.id}`} style={{ textDecoration: "none" }}>
                      <s-button variant="secondary">Edit</s-button>
                    </Link>
                  </s-stack>
                </s-stack>
              </s-box>
            ))}
          </s-stack>
        )}
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
