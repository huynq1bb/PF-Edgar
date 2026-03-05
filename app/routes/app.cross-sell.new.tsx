import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Form, Link, redirect, useActionData, useFetcher } from "react-router";
import { useState, useEffect } from "react";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { resolveProductGid } from "../cross-sell.server";
import prisma from "../db.server";
import type { ProductPreview } from "../cross-sell.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const name = String(formData.get("name") ?? "").trim();
  const triggerValue = String(formData.get("triggerValue") ?? "").trim();
  const suggest1 = String(formData.get("suggest1") ?? "").trim();
  const suggest2 = String(formData.get("suggest2") ?? "").trim();
  const suggest3 = String(formData.get("suggest3") ?? "").trim();

  const form = { name, triggerValue, suggest1, suggest2, suggest3 };

  if (!name || !triggerValue) {
    return { error: "Rule name và Trigger value (sản phẩm chính) là bắt buộc.", form };
  }

  const graphql = (q: string, o: { variables?: Record<string, unknown> }) => admin.graphql(q, o);
  const triggerGid = await resolveProductGid(graphql, triggerValue);
  if (!triggerGid) {
    return { error: "Trigger value không hợp lệ. Nhập link sản phẩm hoặc GID (gid://shopify/Product/...).", form };
  }

  const suggestedProductId1 = suggest1 ? await resolveProductGid(graphql, suggest1) : null;
  const suggestedProductId2 = suggest2 ? await resolveProductGid(graphql, suggest2) : null;
  const suggestedProductId3 = suggest3 ? await resolveProductGid(graphql, suggest3) : null;

  if (!suggestedProductId1 && !suggestedProductId2 && !suggestedProductId3) {
    return { error: "Nhập ít nhất một link sản phẩm gợi ý (1, 2 hoặc 3).", form };
  }

  const repo = (prisma as unknown as Record<string, unknown>).crossSellRule as { create: (args: { data: object }) => Promise<unknown> } | undefined;
  if (!repo?.create) {
    return { error: "Database not ready. Run: npm run setup", form };
  }
  await repo.create({
    data: {
      shop: session.shop,
      name,
      triggerType: "product",
      triggerValue: triggerGid,
      suggestedProductId1: suggestedProductId1 || null,
      suggestedProductId2: suggestedProductId2 || null,
      suggestedProductId3: suggestedProductId3 || null,
      maxRecommendations: 3,
      priority: 0,
      enabled: true,
    },
  });

  return redirect("/app/cross-sell");
};

const inputStyle = {
  width: "100%",
  padding: "8px 12px",
  border: "1px solid #ccc",
  borderRadius: "4px",
  fontSize: "14px",
  marginBottom: "8px",
};
const labelStyle = { display: "block", marginBottom: "4px", fontWeight: 500 as const };

function ProductPreviewCard({ product, label, isMain = false }: { product: ProductPreview | null; label: string; isMain?: boolean }) {
  if (!product) {
    return (
      <div style={{
        padding: isMain ? "20px" : "12px",
        background: isMain ? "#f0f4ff" : "#f6f6f7",
        borderRadius: "10px",
        fontSize: isMain ? "14px" : "13px",
        color: "#666",
        border: isMain ? "2px dashed #5c6ac4" : "1px solid #e1e3e5",
      }}>
        {label}: Chưa có dữ liệu
      </div>
    );
  }
  return (
    <div style={{
      border: isMain ? "2px solid #5c6ac4" : "1px solid #e1e3e5",
      borderRadius: isMain ? "12px" : "8px",
      overflow: "hidden",
      background: isMain ? "#fafbff" : "#fff",
      boxShadow: isMain ? "0 4px 12px rgba(92, 106, 196, 0.15)" : "none",
    }}>
      <div style={{
        padding: isMain ? "12px 14px" : "8px",
        fontWeight: 700,
        fontSize: isMain ? "14px" : "12px",
        background: isMain ? "#5c6ac4" : "#fafafa",
        color: isMain ? "#fff" : "inherit",
      }}>{label}</div>
      {product.imageUrl && (
        <img src={product.imageUrl} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover" }} />
      )}
      <div style={{ padding: isMain ? "16px" : "12px" }}>
        <div style={{ fontWeight: 600, marginBottom: "4px", fontSize: isMain ? "15px" : "14px" }}>{product.title}</div>
        <div style={{ fontSize: isMain ? "13px" : "12px", color: "#666", lineHeight: 1.4 }}>{product.description || "—"}</div>
      </div>
    </div>
  );
}

export default function CrossSellNew() {
  const actionData = useActionData<typeof action>();
  const fetcherTrigger = useFetcher<{ product: ProductPreview | null }>();
  const fetcher1 = useFetcher<{ product: ProductPreview | null }>();
  const fetcher2 = useFetcher<{ product: ProductPreview | null }>();
  const fetcher3 = useFetcher<{ product: ProductPreview | null }>();
  const savedForm = actionData && "form" in actionData ? actionData.form : null;
  const [name, setName] = useState("");
  const [triggerValue, setTriggerValue] = useState("");
  const [suggest1, setSuggest1] = useState("");
  const [suggest2, setSuggest2] = useState("");
  const [suggest3, setSuggest3] = useState("");

  useEffect(() => {
    if (savedForm) {
      setName(savedForm.name ?? "");
      setTriggerValue(savedForm.triggerValue ?? "");
      setSuggest1(savedForm.suggest1 ?? "");
      setSuggest2(savedForm.suggest2 ?? "");
      setSuggest3(savedForm.suggest3 ?? "");
    }
  }, [actionData]);

  const previewTrigger = fetcherTrigger.data?.product ?? null;
  const preview1 = fetcher1.data?.product ?? null;
  const preview2 = fetcher2.data?.product ?? null;
  const preview3 = fetcher3.data?.product ?? null;

  const loadPreview = (value: string, fetcher: typeof fetcherTrigger) => {
    if (!value.trim()) return;
    fetcher.load(`/app/cross-sell/product-preview?product=${encodeURIComponent(value)}`);
  };

  const onPreviewClick = () => {
    loadPreview(triggerValue, fetcherTrigger);
    loadPreview(suggest1, fetcher1);
    loadPreview(suggest2, fetcher2);
    loadPreview(suggest3, fetcher3);
  };

  const isPreviewLoading =
    fetcherTrigger.state === "loading" ||
    fetcher1.state === "loading" ||
    fetcher2.state === "loading" ||
    fetcher3.state === "loading";

  return (
    <s-page heading="Create cross-sell rule">
      <s-section>
        <Form method="post">
          <s-stack direction="block" gap="base">
            {actionData?.error && (
              <div style={{ padding: "12px", background: "#fef2f2", color: "#c00", borderRadius: "6px" }}>
                {actionData.error}
              </div>
            )}

            <div>
              <label htmlFor="name" style={labelStyle}>Rule name *</label>
              <input id="name" name="name" type="text" required placeholder="e.g. Áo – gợi ý quần" style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div>
              <label htmlFor="triggerValue" style={labelStyle}>Trigger value (sản phẩm chính) *</label>
              <input
                id="triggerValue"
                name="triggerValue"
                type="text"
                required
                placeholder="Link sản phẩm hoặc gid://shopify/Product/..."
                style={inputStyle}
                value={triggerValue}
                onChange={(e) => setTriggerValue(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="suggest1" style={labelStyle}>Link sản phẩm suggest 1</label>
              <input
                id="suggest1"
                name="suggest1"
                type="text"
                placeholder="https://store.com/products/handle hoặc GID"
                style={inputStyle}
                value={suggest1}
                onChange={(e) => setSuggest1(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="suggest2" style={labelStyle}>Link sản phẩm suggest 2</label>
              <input
                id="suggest2"
                name="suggest2"
                type="text"
                placeholder="https://store.com/products/handle hoặc GID"
                style={inputStyle}
                value={suggest2}
                onChange={(e) => setSuggest2(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="suggest3" style={labelStyle}>Link sản phẩm suggest 3</label>
              <input
                id="suggest3"
                name="suggest3"
                type="text"
                placeholder="https://store.com/products/handle hoặc GID"
                style={inputStyle}
                value={suggest3}
                onChange={(e) => setSuggest3(e.target.value)}
              />
            </div>

            <div style={{ marginTop: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <span style={{ fontWeight: 600 }}>Preview</span>
                <button
                  type="button"
                  onClick={onPreviewClick}
                  disabled={isPreviewLoading || (!triggerValue.trim() && !suggest1.trim() && !suggest2.trim() && !suggest3.trim())}
                  style={{
                    padding: "6px 14px",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "#fff",
                    background: "#000",
                    border: "none",
                    borderRadius: "6px",
                    cursor: isPreviewLoading ? "wait" : "pointer",
                    opacity: isPreviewLoading ? 0.7 : 1,
                  }}
                >
                  {isPreviewLoading ? "Đang tải…" : "Xem preview"}
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr", gap: "12px" }}>
                <ProductPreviewCard product={previewTrigger} label="Main product" isMain />
                <ProductPreviewCard product={preview1} label="Suggest 1" />
                <ProductPreviewCard product={preview2} label="Suggest 2" />
                <ProductPreviewCard product={preview3} label="Suggest 3" />
              </div>
            </div>

            <s-stack direction="inline" gap="base" style={{ marginTop: "16px" }}>
              <button type="submit" style={{ padding: "8px 16px", fontSize: "14px", fontWeight: 500, color: "#fff", background: "#000", border: "none", borderRadius: "6px", cursor: "pointer" }}>
                Create rule
              </button>
              <Link to="/app/cross-sell" style={{ textDecoration: "none" }}>
                <button type="button" style={{ padding: "8px 16px", fontSize: "14px", fontWeight: 500, color: "#333", background: "#f6f6f7", border: "1px solid #ccc", borderRadius: "6px", cursor: "pointer" }}>
                  Cancel
                </button>
              </Link>
            </s-stack>
          </s-stack>
        </Form>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
