/**
 * Size prediction admin page UI.
 * Tabs: Settings (setup + widget settings) | Preview (product detail + size widget, interactive).
 */
import { useCallback, useEffect, useState } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import {
  DEFAULT_CHART_WITH_RANGES,
  type MappingRow,
  type SizePredictLoaderData,
} from "./types";

export function SizePredictPage() {
  const { settings, rules, products, collections, previewProduct } = useLoaderData() as SizePredictLoaderData;
  const fetcher = useFetcher<{ ok: boolean; error?: string; savedMappings?: MappingRow[]; testResult?: { size: string; confidence: number } }>();
  const shopify = useAppBridge();
  const [widgetEnabled, setWidgetEnabled] = useState(settings.widgetEnabled);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);

  const firstRule = rules[0];
  const [chartMappings, setChartMappings] = useState<MappingRow[]>(() =>
    firstRule?.mappings?.length
      ? firstRule.mappings.map((m) => ({ ...m }))
      : DEFAULT_CHART_WITH_RANGES.map((m) => ({ ...m }))
  );

  useEffect(() => {
    setWidgetEnabled(settings.widgetEnabled);
  }, [settings.widgetEnabled]);

  useEffect(() => {
    const r = rules[0];
    if (fetcher.data?.ok && fetcher.data?.savedMappings?.length) {
      return;
    }
    if (r?.mappings && r.mappings.length > 0) {
      setChartMappings(r.mappings.map((m) => ({ ...m })));
    } else if (!r) {
      setChartMappings(DEFAULT_CHART_WITH_RANGES.map((m) => ({ ...m })));
    }
  }, [rules, fetcher.data?.ok, fetcher.data?.savedMappings]);

  useEffect(() => {
    if (fetcher.data?.ok && fetcher.state === "idle" && !fetcher.data?.testResult) {
      shopify.toast.show("Saved");
      if (fetcher.data.savedMappings && fetcher.data.savedMappings.length > 0) {
        setChartMappings(fetcher.data.savedMappings.map((m) => ({ ...m })));
      }
    }
    if (fetcher.data?.ok === false && fetcher.data?.error) {
      shopify.toast.show(fetcher.data.error as string, { isError: true });
    }
  }, [fetcher.data, fetcher.state, shopify]);

  const updateChartRow = (i: number, field: keyof MappingRow, value: string | number) => {
    const v =
      typeof value === "string" && ["heightMin", "heightMax", "weightMin", "weightMax"].includes(field)
        ? parseFloat(value) || 0
        : value;
    setChartMappings((p) => {
      const n = [...p];
      n[i] = { ...n[i], [field]: v };
      return n;
    });
  };
  const addChartRow = () =>
    setChartMappings((p) => [...p, { sizeName: "", heightMin: 0, heightMax: 0, weightMin: 0, weightMax: 0 }]);
  const removeChartRow = (i: number) => setChartMappings((p) => p.filter((_, j) => j !== i));

  const saveSizeChart = useCallback(() => {
    const form = new FormData();
    if (firstRule) {
      form.set("intent", "updateRule");
      form.set("ruleId", firstRule.id);
      form.set("name", firstRule.name);
    } else {
      form.set("intent", "createRule");
      form.set("name", "Default size chart");
    }
    form.set("scopeType", "all");
    form.set("scopeValue", "");
    form.set("chart", JSON.stringify(chartMappings));
    fetcher.submit(form, { method: "POST" });
  }, [firstRule, chartMappings, fetcher]);

  const submitPreviewPrediction = useCallback(
    (height: string, weight: string) => {
      if (!previewProduct) return;
      const form = new FormData();
      form.set("intent", "testPrediction");
      form.set("height", height);
      form.set("weight", weight);
      form.set("productId", previewProduct.id);
      fetcher.submit(form, { method: "POST" });
    },
    [previewProduct, fetcher]
  );

  const testResult = fetcher.data?.testResult;
  const previewLoading = fetcher.state !== "idle";

  useEffect(() => {
    if (!testResult?.size || !previewProduct) return;
    const variant = previewProduct.variants.find((v) =>
      v.selectedOptions.some((o) => o.value.toUpperCase() === testResult.size.toUpperCase())
    );
    if (variant) setSelectedVariantId(variant.id);
  }, [testResult?.size, previewProduct]);

  return (
    <s-page heading="Size prediction">
      <style>{`
        .size-predict-layout { display: flex; flex-wrap: wrap; width: 100%; max-width: 100%; gap: 0; }
        .size-predict-col-settings { flex: 2 2 66.666%; min-width: 320px; padding-right: 24px; box-sizing: border-box; }
        .size-predict-col-preview { flex: 1 1 33.333%; min-width: 280px; padding-left: 24px; box-sizing: border-box; border-left: 1px solid #e1e3e5; }
        .size-predict-settings-content .size-predict-section { margin-bottom: 32px; }
        .size-predict-settings-content .size-predict-section:last-child { margin-bottom: 0; }
        @media (max-width: 900px) {
          .size-predict-col-settings { flex: 1 1 100%; padding-right: 0; padding-bottom: 24px; }
          .size-predict-col-preview { flex: 1 1 100%; min-width: 100%; border-left: none; border-top: 1px solid #e1e3e5; padding-left: 0; padding-top: 24px; }
        }
      `}</style>
      <div className="size-predict-layout">
        {/* Left: Settings */}
        <div className="size-predict-col-settings">
          <h2 style={{ margin: "0 0 20px", fontSize: "1.125rem", fontWeight: 600 }}>Settings</h2>
          <div className="size-predict-settings-content">
          <div className="size-predict-section">
          <s-section heading="Size prediction">
        <s-stack direction="block" gap="base">
          <s-switch
            label="Enable size recommendation on product pages"
            checked={widgetEnabled}
            onChange={(e) => {
              const checked = (e.currentTarget as unknown as { checked?: boolean }).checked ?? false;
              setWidgetEnabled(checked);
              fetcher.submit(
                { intent: "toggle", widgetEnabled: String(checked) },
                { method: "POST" }
              );
            }}
          />
        </s-stack>
      </s-section>
          </div>

      <div className="size-predict-section">
      <s-section heading="Size prediction setup">
        <s-stack direction="block" gap="base">
          <s-section padding="none">
            <s-table variant="auto">
              <s-table-header-row>
                <s-table-header listSlot="primary">Size Name</s-table-header>
                <s-table-header listSlot="labeled" format="numeric">Height Min ({settings.heightUnit})</s-table-header>
                <s-table-header listSlot="labeled" format="numeric">Height Max ({settings.heightUnit})</s-table-header>
                <s-table-header listSlot="labeled" format="numeric">Weight Min ({settings.weightUnit})</s-table-header>
                <s-table-header listSlot="labeled" format="numeric">Weight Max ({settings.weightUnit})</s-table-header>
                <s-table-header listSlot="inline">Action</s-table-header>
              </s-table-header-row>
              <s-table-body>
                {chartMappings.map((row, i) => (
                  <s-table-row key={i}>
                    <s-table-cell>
                      <s-text-field
                        labelAccessibilityVisibility="exclusive"
                        value={row.sizeName}
                        onChange={(e) => updateChartRow(i, "sizeName", e.currentTarget.value)}
                        placeholder="S"
                      />
                    </s-table-cell>
                    <s-table-cell>
                      <s-number-field
                        labelAccessibilityVisibility="exclusive"
                        value={String(row.heightMin)}
                        onChange={(e) => updateChartRow(i, "heightMin", e.currentTarget.value)}
                        min={0}
                        max={250}
                        step={0.1}
                      />
                    </s-table-cell>
                    <s-table-cell>
                      <s-number-field
                        labelAccessibilityVisibility="exclusive"
                        value={String(row.heightMax)}
                        onChange={(e) => updateChartRow(i, "heightMax", e.currentTarget.value)}
                        min={0}
                        max={250}
                        step={0.1}
                      />
                    </s-table-cell>
                    <s-table-cell>
                      <s-number-field
                        labelAccessibilityVisibility="exclusive"
                        value={String(row.weightMin)}
                        onChange={(e) => updateChartRow(i, "weightMin", e.currentTarget.value)}
                        min={0}
                        max={300}
                        step={0.1}
                      />
                    </s-table-cell>
                    <s-table-cell>
                      <s-number-field
                        labelAccessibilityVisibility="exclusive"
                        value={String(row.weightMax)}
                        onChange={(e) => updateChartRow(i, "weightMax", e.currentTarget.value)}
                        min={0}
                        max={300}
                        step={0.1}
                      />
                    </s-table-cell>
                    <s-table-cell>
                      <s-button variant="tertiary" tone="critical" onClick={() => removeChartRow(i)}>
                        🗑️
                      </s-button>
                    </s-table-cell>
                  </s-table-row>
                ))}
              </s-table-body>
            </s-table>
          </s-section>
          <s-stack direction="inline" gap="small">
            <s-button variant="secondary" onClick={addChartRow}>
              Add row
            </s-button>
            <s-button variant="primary" onClick={saveSizeChart} disabled={fetcher.state !== "idle"}>
              Save size chart
            </s-button>
          </s-stack>
        </s-stack>
      </s-section>
          </div>

      <div className="size-predict-section">
      <s-section heading="Widget Settings">
        <fetcher.Form method="post">
          <input type="hidden" name="intent" value="saveSettings" />
          <input type="hidden" name="autoSelectSize" value="false" />
          <s-stack direction="block" gap="base">
            <s-text-field
              label="Button label"
              name="buttonLabel"
              defaultValue={settings.buttonLabel}
              details="Default: Find my size"
            />
            <s-text-field
              label="Helper text"
              name="helperText"
              defaultValue={settings.helperText}
              details="Suggest the best size for you"
            />
            <s-stack direction="block" gap="small">
              <s-text type="strong">Units</s-text>
              <s-text-field label="Height unit" name="heightUnit" defaultValue={settings.heightUnit} />
              <s-text-field label="Weight unit" name="weightUnit" defaultValue={settings.weightUnit} />
            </s-stack>
            <s-switch
              label="Auto select size"
              name="autoSelectSize"
              value="true"
              defaultChecked={settings.autoSelectSize}
              details="Automatically select recommended size"
            />
            <s-button type="submit" variant="primary">
              Save widget settings
            </s-button>
        </s-stack>
      </fetcher.Form>
      </s-section>
          </div>
        </div>
        </div>

        {/* Right: Preview */}
        <div className="size-predict-col-preview">
          <h2 style={{ margin: "0 0 16px", fontSize: "1.125rem", fontWeight: 600 }}>Preview</h2>
          {!previewProduct ? (
            <s-paragraph>
              Không tìm thấy product &quot;The Collection Snowboard: Liquid&quot;. Đảm bảo store có product này hoặc đổi query trong loader.
            </s-paragraph>
          ) : (
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              {/* Product media - left */}
              {(() => {
                const mediaUrls =
                  (previewProduct.images && previewProduct.images.length > 0)
                    ? previewProduct.images
                    : previewProduct.featuredImageUrl
                      ? [previewProduct.featuredImageUrl]
                      : [];
                return (
              <div style={{ flex: "0 0 200px", minWidth: 180 }}>
                {mediaUrls.length > 0 ? (
                  <div>
                    <img
                      src={mediaUrls[previewImageIndex]}
                      alt={previewProduct.title}
                      style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 8, border: "1px solid #e1e3e5" }}
                    />
                    {mediaUrls.length > 1 && (
                      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                        {mediaUrls.map((url, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setPreviewImageIndex(i)}
                            style={{
                              width: 48,
                              height: 48,
                              padding: 0,
                              border: previewImageIndex === i ? "2px solid #008060" : "1px solid #ccc",
                              borderRadius: 6,
                              cursor: "pointer",
                              overflow: "hidden",
                              background: "#fff",
                            }}
                          >
                            <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ width: "100%", aspectRatio: "1", background: "#f0f0f0", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#666", fontSize: 14 }}>
                    No image
                  </div>
                )}
              </div>
                );
              })()}

              {/* Product info + variant picker + widget - right */}
              <div style={{ flex: "1 1 280px", minWidth: 0 }}>
                <h3 style={{ margin: "0 0 16px", fontSize: "1.25rem", fontWeight: 600 }}>
                  {previewProduct.title}
                </h3>

                {/* Variant picker — tự chọn khi có testResult */}
                {previewProduct.options.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    {previewProduct.options.map((opt) => (
                      <div key={opt.name} style={{ marginBottom: 12 }}>
                        <label style={{ display: "block", fontWeight: 600, marginBottom: 6, fontSize: 14 }}>
                          {opt.name}
                        </label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {opt.values.map((val) => {
                            const variant = previewProduct.variants.find((v) =>
                              v.selectedOptions.some((o) => o.name === opt.name && o.value === val)
                            );
                            const isSelected = variant ? selectedVariantId === variant.id : false;
                            return (
                              <button
                                key={val}
                                type="button"
                                onClick={() => variant && setSelectedVariantId(variant.id)}
                                style={{
                                  padding: "8px 14px",
                                  border: isSelected ? "2px solid #008060" : "1px solid #ccc",
                                  borderRadius: 6,
                                  background: isSelected ? "#e6f4f0" : "transparent",
                                  cursor: "pointer",
                                  fontSize: 14,
                                }}
                              >
                                {val}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Size prediction widget */}
                <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid #e1e3e5" }}>
                  <h4 style={{ margin: "0 0 12px", fontSize: "1rem", fontWeight: 600 }}>
                    {settings.buttonLabel}
                  </h4>
                  <p style={{ margin: "0 0 12px", fontSize: 14, color: "#666" }}>
                    {settings.helperText}
                  </p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      const height = (form.querySelector('[name="preview-height"]') as HTMLInputElement)?.value;
                      const weight = (form.querySelector('[name="preview-weight"]') as HTMLInputElement)?.value;
                      if (height && weight) submitPreviewPrediction(height, weight);
                    }}
                    style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}
                  >
                    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 14 }}>
                      <span>Chiều cao ({settings.heightUnit})</span>
                      <input
                        name="preview-height"
                        type="number"
                        min={50}
                        max={250}
                        step={1}
                        placeholder="170"
                        required
                        style={{ padding: "8px 10px", border: "1px solid #ccc", borderRadius: 4, width: 100 }}
                      />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 14 }}>
                      <span>Cân nặng ({settings.weightUnit})</span>
                      <input
                        name="preview-weight"
                        type="number"
                        min={30}
                        max={200}
                        step={0.5}
                        placeholder="65"
                        required
                        style={{ padding: "8px 10px", border: "1px solid #ccc", borderRadius: 4, width: 100 }}
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={previewLoading}
                      style={{
                        padding: "8px 16px",
                        background: "#008060",
                        color: "#fff",
                        border: "none",
                        borderRadius: 4,
                        fontWeight: 500,
                        cursor: previewLoading ? "wait" : "pointer",
                      }}
                    >
                      {previewLoading ? "…" : settings.buttonLabel}
                    </button>
                  </form>
                  {testResult && fetcher.state === "idle" && (
                    <p style={{ margin: "16px 0 0", color: "#008060", fontWeight: 500 }}>
                      Size {testResult.size} — {Math.round(testResult.confidence)}% confidence.
                      {previewProduct.variants.some((v) =>
                        v.selectedOptions.some((o) => o.value.toUpperCase() === testResult.size.toUpperCase())
                      ) && (
                        <span style={{ display: "block", marginTop: 4 }}>
                          (Đã tự chọn variant tương ứng.)
                        </span>
                      )}
                    </p>
                  )}
                  {fetcher.data?.ok === false && fetcher.data?.error && fetcher.state === "idle" && (
                    <p style={{ margin: "16px 0 0", color: "#d72c0d" }}>{fetcher.data.error}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </s-page>
  );
}
