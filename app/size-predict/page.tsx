/**
 * Size prediction admin page UI.
 * Section "Size prediction setup" = bảng thiết lập range height/weight cho từng size.
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
  const { settings, rules, products, collections } = useLoaderData() as SizePredictLoaderData;
  const fetcher = useFetcher<{ ok: boolean; error?: string; savedMappings?: MappingRow[] }>();
  const shopify = useAppBridge();
  const [widgetEnabled, setWidgetEnabled] = useState(settings.widgetEnabled);

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
    if (fetcher.data?.ok && fetcher.state === "idle") {
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

  return (
    <s-page heading="AI Size Predict">
      <s-section heading="AI Size Predict">
        <s-stack direction="block" gap="base">
          <s-switch
            label="Enable AI size recommendation on product pages"
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

      <s-divider />

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

      <s-divider />

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
              details="Let AI suggest the best size for you"
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
    </s-page>
  );
}
