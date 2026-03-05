/**
 * One size group as an inline-editable card: name, table (with overlap warning), assignment, Save/Duplicate/Delete.
 */
import { useState, useEffect } from "react";
import { useFetcher } from "react-router";
import {
  DEFAULT_SIZES,
  DEFAULT_MAPPINGS,
  getOverlapWarningIndices,
  type MappingRow,
  type ScopeType,
  type SizePredictRule,
} from "./types";

type SizeGroupCardProps = {
  rule: SizePredictRule;
  products: Array<{ id: string; title: string }>;
  collections: Array<{ id: string; title: string }>;
  heightUnit: string;
  weightUnit: string;
};

export function SizeGroupCard({
  rule,
  products,
  collections,
  heightUnit,
  weightUnit,
}: SizeGroupCardProps) {
  const fetcher = useFetcher<{ ok: boolean; error?: string }>();
  const [name, setName] = useState(rule.name);
  const [mappings, setMappings] = useState<MappingRow[]>(() =>
    rule.mappings.length ? rule.mappings.map((m) => ({ ...m })) : DEFAULT_MAPPINGS.map((m) => ({ ...m }))
  );
  const [scopeType, setScopeType] = useState<ScopeType>((rule.scopeType as ScopeType) || "all");
  const [scopeValue, setScopeValue] = useState(rule.scopeValue ?? "");
  const [manualProductIds, setManualProductIds] = useState<string[]>(() => {
    if (rule.scopeType !== "manual" || !rule.scopeValue) return [];
    try {
      const ids = JSON.parse(rule.scopeValue) as string[];
      return Array.isArray(ids) ? ids : [];
    } catch {
      return [];
    }
  });
  const [sizes, setSizes] = useState<string[]>(() => [
    ...new Set([...DEFAULT_SIZES, ...rule.mappings.map((m) => m.sizeName)]),
  ]);

  useEffect(() => {
    setName(rule.name);
    setMappings(
      rule.mappings.length ? rule.mappings.map((m) => ({ ...m })) : DEFAULT_MAPPINGS.map((m) => ({ ...m }))
    );
    setScopeType((rule.scopeType as ScopeType) || "all");
    setScopeValue(rule.scopeValue ?? "");
    setManualProductIds(() => {
      if (rule.scopeType !== "manual" || !rule.scopeValue) return [];
      try {
        const ids = JSON.parse(rule.scopeValue) as string[];
        return Array.isArray(ids) ? ids : [];
      } catch {
        return [];
      }
    });
    setSizes((prev) => [...new Set([...prev, ...rule.mappings.map((m) => m.sizeName)])]);
  }, [rule.id, rule.name, rule.scopeType, rule.scopeValue, rule.mappings]);

  const overlapIndices = getOverlapWarningIndices(mappings);
  const addMappingRow = () =>
    setMappings((p) => [...p, { sizeName: sizes[0] || "S", heightMin: 0, heightMax: 0, weightMin: 0, weightMax: 0 }]);
  const updateMapping = (i: number, field: keyof MappingRow, value: string | number) => {
    const v =
      typeof value === "string" && ["heightMin", "heightMax", "weightMin", "weightMax"].includes(field)
        ? parseFloat(value) || 0
        : value;
    setMappings((p) => {
      const n = [...p];
      n[i] = { ...n[i], [field]: v };
      return n;
    });
  };
  const removeMapping = (i: number) => setMappings((p) => p.filter((_, j) => j !== i));

  const save = () => {
    const form = new FormData();
    form.set("intent", "updateRule");
    form.set("ruleId", rule.id);
    form.set("name", name.trim() || rule.name);
    form.set("scopeType", scopeType);
    form.set(
      "scopeValue",
      scopeType === "all" ? "" : scopeType === "manual" ? JSON.stringify(manualProductIds) : scopeValue
    );
    form.set("chart", JSON.stringify(mappings));
    fetcher.submit(form, { method: "POST" });
  };

  const duplicate = () => {
    fetcher.submit({ intent: "duplicateRule", ruleId: rule.id }, { method: "POST" });
  };

  const remove = () => {
    fetcher.submit({ intent: "deleteRule", ruleId: rule.id }, { method: "POST" });
  };

  const toggleStatus = () => {
    fetcher.submit({ intent: "toggleRule", ruleId: rule.id, status: rule.status }, { method: "POST" });
  };

  return (
    <s-box padding="base" background="subdued" borderRadius="base">
      <s-stack direction="block" gap="base">
        <s-text type="strong">Size Group</s-text>
        <s-text-field
          label="Tên nhóm size"
          labelAccessibilityVisibility="exclusive"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="e.g. Standard T-shirt"
        />

        <s-section padding="none">
          <s-table variant="auto">
            <s-table-header-row>
              <s-table-header listSlot="primary">Size</s-table-header>
              <s-table-header listSlot="labeled" format="numeric">
                Height min ({heightUnit})
              </s-table-header>
              <s-table-header listSlot="labeled" format="numeric">
                Height max ({heightUnit})
              </s-table-header>
              <s-table-header listSlot="labeled" format="numeric">
                Weight min ({weightUnit})
              </s-table-header>
              <s-table-header listSlot="labeled" format="numeric">
                Weight max ({weightUnit})
              </s-table-header>
              <s-table-header listSlot="inline">Action</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {mappings.map((row, i) => (
                <s-table-row key={i}>
                  <s-table-cell>
                    <s-text-field
                      labelAccessibilityVisibility="exclusive"
                      value={row.sizeName}
                      onChange={(e) => updateMapping(i, "sizeName", e.currentTarget.value)}
                      placeholder="S"
                    />
                  </s-table-cell>
                  <s-table-cell>
                    <s-number-field
                      labelAccessibilityVisibility="exclusive"
                      value={String(row.heightMin)}
                      onChange={(e) => updateMapping(i, "heightMin", e.currentTarget.value)}
                      min={0}
                      max={250}
                      step={0.1}
                    />
                  </s-table-cell>
                  <s-table-cell>
                    <s-number-field
                      labelAccessibilityVisibility="exclusive"
                      value={String(row.heightMax)}
                      onChange={(e) => updateMapping(i, "heightMax", e.currentTarget.value)}
                      min={0}
                      max={250}
                      step={0.1}
                    />
                  </s-table-cell>
                  <s-table-cell>
                    <s-number-field
                      labelAccessibilityVisibility="exclusive"
                      value={String(row.weightMin)}
                      onChange={(e) => updateMapping(i, "weightMin", e.currentTarget.value)}
                      min={0}
                      max={300}
                      step={0.1}
                    />
                  </s-table-cell>
                  <s-table-cell>
                    <s-number-field
                      labelAccessibilityVisibility="exclusive"
                      value={String(row.weightMax)}
                      onChange={(e) => updateMapping(i, "weightMax", e.currentTarget.value)}
                      min={0}
                      max={300}
                      step={0.1}
                    />
                  </s-table-cell>
                  <s-table-cell>
                    <s-button variant="tertiary" onClick={() => removeMapping(i)}>
                      Remove
                    </s-button>
                  </s-table-cell>
                </s-table-row>
              ))}
            </s-table-body>
          </s-table>
        </s-section>
        {overlapIndices.size > 0 && (
          <s-banner tone="critical">
            <s-text type="strong">Overlap warning:</s-text> Một số khoảng chiều cao/cân nặng đang chồng lấn giữa các size. Nên chỉnh lại để tránh gợi ý nhầm.
          </s-banner>
        )}
        <s-stack direction="inline" gap="small">
          <s-button variant="secondary" onClick={addMappingRow}>
            Add row
          </s-button>
          <s-button variant="primary" onClick={save} disabled={fetcher.state !== "idle"}>
            Save size chart
          </s-button>
        </s-stack>

        <s-divider />

        <s-text type="strong">Phạm vi áp dụng (Product Assignment)</s-text>
        <s-paragraph>
          Phần này giúp AI biết quy tắc nào áp dụng cho sản phẩm nào.
        </s-paragraph>
        <s-stack direction="block" gap="small">
          <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="radio"
              name={`scope-${rule.id}`}
              checked={scopeType === "all"}
              onChange={() => setScopeType("all")}
            />
            <s-text>Tất cả sản phẩm (All products)</s-text>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="radio"
              name={`scope-${rule.id}`}
              checked={scopeType === "collection"}
              onChange={() => setScopeType("collection")}
            />
            <s-text>Theo Bộ sưu tập (Collections):</s-text>
          </label>
          {scopeType === "collection" && (
            <s-select
              label="Chọn Collection"
              labelAccessibilityVisibility="exclusive"
              value={scopeValue}
              onChange={(e) => setScopeValue(e.currentTarget.value)}
            >
              <s-option value="">Chọn Collection...</s-option>
              {collections.map((c) => (
                <s-option key={c.id} value={c.id}>
                  {c.title}
                </s-option>
              ))}
            </s-select>
          )}
          <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="radio"
              name={`scope-${rule.id}`}
              checked={scopeType === "manual"}
              onChange={() => setScopeType("manual")}
            />
            <s-text>Chọn thủ công (Manual):</s-text>
          </label>
          {scopeType === "manual" && (
            <div
              style={{
                maxHeight: "180px",
                overflowY: "auto",
                border: "1px solid var(--p-color-border)",
                borderRadius: "var(--p-border-radius-base)",
                padding: "var(--p-space-200)",
              }}
            >
              <s-text>Tìm sản phẩm...</s-text>
              {products.map((p) => (
                <label
                  key={p.id}
                  style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}
                >
                  <input
                    type="checkbox"
                    checked={manualProductIds.includes(p.id)}
                    onChange={(e) => {
                      if (e.currentTarget.checked)
                        setManualProductIds((prev) => [...prev, p.id]);
                      else setManualProductIds((prev) => prev.filter((id) => id !== p.id));
                    }}
                  />
                  <s-text>{p.title}</s-text>
                </label>
              ))}
            </div>
          )}
          <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="radio"
              name={`scope-${rule.id}`}
              checked={scopeType === "product_type"}
              onChange={() => setScopeType("product_type")}
            />
            <s-text>Theo điều kiện cụ thể (Specific conditions):</s-text>
          </label>
          {scopeType === "product_type" && (
            <s-stack direction="block" gap="small">
              <s-text-field
                labelAccessibilityVisibility="exclusive"
                value={scopeValue}
                onChange={(e) => setScopeValue(e.currentTarget.value)}
                placeholder='VD: "Product Title" có chứa "Slimfit" hoặc Tag là "Unisex"'
              />
              <s-text tone="neutral">
                Ví dụ: Nếu "Product Title" có chứa chữ "Slimfit". Ví dụ: Nếu "Tag" là "Unisex".
              </s-text>
            </s-stack>
          )}
        </s-stack>

        <s-divider />

        <s-stack direction="inline" gap="small">
          <s-button variant="secondary" onClick={duplicate} disabled={fetcher.state !== "idle"}>
            Duplicate Group
          </s-button>
          <s-button
            variant="secondary"
            onClick={toggleStatus}
            disabled={fetcher.state !== "idle"}
          >
            {rule.status === "active" ? "Disable" : "Enable"}
          </s-button>
          <s-button
            variant="secondary"
            tone="critical"
            onClick={remove}
            disabled={fetcher.state !== "idle"}
          >
            Delete
          </s-button>
        </s-stack>
        {rule.status !== "active" && (
          <s-badge tone="critical">Disabled</s-badge>
        )}
      </s-stack>
    </s-box>
  );
}
