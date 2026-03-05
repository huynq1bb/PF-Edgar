import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useRouteError } from "react-router";
import { authenticate } from "../shopify.server";
import { useState } from "react";
import {
  getTryOnKPIs,
  getTryOnTrend,
  getTopProductsTryOn,
  type TrendPeriod,
} from "../analytics.server";
import {
  getGaConfig,
  setGaConfig,
  disconnectGa,
  getLastTryOnEventAt,
  getTryOnEventsCountToday,
} from "../google-analytics.server";

const DEFAULT_DAYS = 30;

// Sample data for demo when no real events exist
function getSampleKpis() {
  return {
    tryOnSessions: 1247,
    addToCartAfterTryOn: 312,
    conversionRate: 25.02,
  };
}

// Sample: Dec 2025 – Feb 2026. One point per month for readable x-axis.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getSampleTrendDaily(): { label: string; tryOnSessions: number; addToCart: number; conversionRate: number }[] {
  const points: { label: string; tryOnSessions: number; addToCart: number; conversionRate: number }[] = [];
  const start = new Date(2025, 11, 1); // 2025-12-01
  const end = new Date(2026, 1, 28);   // 2026-02-28
  const count = 12;
  for (let i = 0; i < count; i++) {
    const d = new Date(start.getTime() + (i / (count - 1)) * (end.getTime() - start.getTime()));
    const label = d.toISOString().slice(0, 10);
    const tryOn = Math.round(45 + (i / count) * 40 + Math.sin(i * 0.6) * 12 + (i % 3) * 4);
    const addToCart = Math.round(tryOn * (0.22 + (i % 4) * 0.02));
    points.push({
      label,
      tryOnSessions: Math.max(30, tryOn),
      addToCart: Math.max(10, addToCart),
      conversionRate: tryOn > 0 ? Math.round((addToCart / tryOn) * 10000) / 100 : 0,
    });
  }
  return points;
}

function getSampleTrendWeekly(): { label: string; tryOnSessions: number; addToCart: number; conversionRate: number }[] {
  const points: { label: string; tryOnSessions: number; addToCart: number; conversionRate: number }[] = [];
  const weekLabels = ["Dec '25", "Dec '25", "Jan '26", "Jan '26", "Feb '26", "Feb '26"];
  const weekNumbers = [280, 310, 320, 340, 330, 360];
  for (let w = 0; w < weekLabels.length; w++) {
    const tryOn = weekNumbers[w] ?? 320;
    const addToCart = Math.round(tryOn * (0.23 + (w % 3) * 0.02));
    points.push({
      label: weekLabels[w],
      tryOnSessions: tryOn,
      addToCart,
      conversionRate: tryOn > 0 ? Math.round((addToCart / tryOn) * 10000) / 100 : 0,
    });
  }
  return points;
}

function formatAxisLabel(raw: string, period: "daily" | "weekly"): string {
  const dailyMatch = raw.match(/^(\d{4})-(\d{2})/);
  if (dailyMatch) {
    const y = dailyMatch[1].slice(2);
    const m = parseInt(dailyMatch[2], 10) - 1;
    return `${MONTHS[m]} '${y}`;
  }
  const weeklyMatch = raw.match(/^W(\d+)-(\d{4})$/);
  if (weeklyMatch) return `W${weeklyMatch[1]} '${weeklyMatch[2].slice(2)}`;
  return raw.length > 8 ? raw.slice(0, 8) : raw;
}

function formatTimeAgo(date: Date): string {
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return "Just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const d = Math.floor(hr / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date(to);
  from.setDate(from.getDate() - DEFAULT_DAYS);
  from.setHours(0, 0, 0, 0);

  const [kpis, trendDaily, trendWeekly, topProducts, gaConfig, lastEventAt, eventsToday] =
    await Promise.all([
      getTryOnKPIs(shop, from, to),
      getTryOnTrend(shop, "daily", DEFAULT_DAYS),
      getTryOnTrend(shop, "weekly", DEFAULT_DAYS),
      getTopProductsTryOn(shop, from, to, 10),
      getGaConfig(shop),
      getLastTryOnEventAt(shop),
      getTryOnEventsCountToday(shop),
    ]);

  const hasRealData = kpis.tryOnSessions > 0 || trendDaily.length > 0;
  const displayKpis = hasRealData ? kpis : getSampleKpis();
  const displayTrendDaily = hasRealData ? trendDaily : getSampleTrendDaily();
  const displayTrendWeekly = hasRealData ? trendWeekly : getSampleTrendWeekly();

  return {
    kpis: displayKpis,
    trendDaily: displayTrendDaily,
    trendWeekly: displayTrendWeekly,
    topProducts,
    gaConfig,
    lastEventSentAt: lastEventAt ? lastEventAt.toISOString() : null,
    tryOnEventsToday: eventsToday,
    isSampleData: !hasRealData,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const form = await request.formData();
  const intent = form.get("intent");

  if (intent === "connect") {
    const measurementId = form.get("measurementId")?.toString()?.trim() ?? "";
    const propertyName = form.get("propertyName")?.toString()?.trim() || null;
    await setGaConfig(shop, measurementId, propertyName);
    return { ok: true, connected: true };
  }
  if (intent === "disconnect") {
    await disconnectGa(shop);
    return { ok: true, connected: false };
  }
  return { ok: false };
};

const defaultKpis = {
  tryOnSessions: 0,
  addToCartAfterTryOn: 0,
  conversionRate: 0,
};

const GA_EVENTS = [
  { name: "try_on_click", description: "User click Try-On button", status: "Active" },
  { name: "try_on_view", description: "Outfit generated", status: "Active" },
  { name: "add_to_cart_after_try_on", description: "Product added to cart after try-on", status: "Active" },
] as const;

const CHART_HEIGHT = 260;
const CHART_PADDING = { top: 16, right: 16, bottom: 44, left: 40 };

function LineChartSection({
  trend,
  period,
  onPeriodChange,
  isSampleData,
}: {
  trend: { label: string; tryOnSessions: number; addToCart: number }[];
  period: TrendPeriod;
  onPeriodChange: (p: TrendPeriod) => void;
  isSampleData?: boolean;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const width = 640;
  const innerWidth = width - CHART_PADDING.left - CHART_PADDING.right;
  const innerHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

  const maxTryOn = Math.max(1, ...trend.map((t) => t.tryOnSessions));
  const maxAddToCart = Math.max(1, ...trend.map((t) => t.addToCart));
  const maxY = Math.max(maxTryOn, maxAddToCart);

  const scaleX = (i: number) =>
    CHART_PADDING.left + (i / Math.max(1, trend.length - 1)) * innerWidth;
  const scaleY = (v: number) =>
    CHART_PADDING.top + innerHeight - (v / maxY) * innerHeight;

  const tryOnPath =
    trend.length > 0
      ? trend
          .map((p, i) => `${i === 0 ? "M" : "L"} ${scaleX(i)} ${scaleY(p.tryOnSessions)}`)
          .join(" ")
      : "";
  const addToCartPath =
    trend.length > 0
      ? trend
          .map((p, i) => `${i === 0 ? "M" : "L"} ${scaleX(i)} ${scaleY(p.addToCart)}`)
          .join(" ")
      : "";

  const formatLabel = (raw: string) => formatAxisLabel(raw, period);
  const xLabelStep = Math.max(1, Math.floor(trend.length / 10));
  const showLabel = (i: number) => i % xLabelStep === 0 || i === trend.length - 1;

  const handleChartMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const index = Math.round(x * (trend.length - 1));
    const clamped = Math.max(0, Math.min(index, trend.length - 1));
    setHoveredIndex(clamped);
  };

  const handleChartMouseLeave = () => setHoveredIndex(null);

  return (
    <s-section heading="Biểu đồ hành vi theo thời gian">
      <s-box padding="large" borderWidth="base" borderRadius="base" background="subdued">
        <s-stack direction="block" gap="base">
          {isSampleData && (
            <s-paragraph>Sample chart. Try-On Clicks (blue) and Add-to-Cart after Try-On (green) over time. Switch to Daily/Weekly to see how the view changes.</s-paragraph>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16, justifyContent: "space-between" }}>
            <s-stack direction="inline" gap="base">
              <s-button
                variant={period === "daily" ? "primary" : "secondary"}
                onClick={() => onPeriodChange("daily")}
              >
                Daily
              </s-button>
              <s-button
                variant={period === "weekly" ? "primary" : "secondary"}
                onClick={() => onPeriodChange("weekly")}
              >
                Weekly
              </s-button>
            </s-stack>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 14, height: 4, borderRadius: 2, background: "#0ea5e9" }} />
                <s-text>Try-On Clicks</s-text>
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 14, height: 4, borderRadius: 2, background: "#f59e0b" }} />
                <s-text>Add-to-Cart after Try-On</s-text>
              </span>
            </div>
          </div>
          {trend.length === 0 ? (
            <s-box padding="large" background="subdued" borderRadius="base">
              <s-text>No data in this period.</s-text>
            </s-box>
          ) : (
            <div
              style={{ width: "100%", minWidth: 0, position: "relative" }}
              onMouseMove={handleChartMouseMove}
              onMouseLeave={handleChartMouseLeave}
            >
          {hoveredIndex !== null && trend[hoveredIndex] && (
            <div
              style={{
                position: "absolute",
                left: `${(hoveredIndex / Math.max(1, trend.length - 1)) * 100}%`,
                top: 8,
                transform: "translateX(-50%)",
                background: "#1e293b",
                color: "#fff",
                padding: "8px 12px",
                borderRadius: 8,
                fontSize: 12,
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                pointerEvents: "none",
                zIndex: 10,
                whiteSpace: "nowrap",
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{formatLabel(trend[hoveredIndex].label)}</div>
              <div style={{ color: "#7dd3fc" }}>Try-On Clicks: {trend[hoveredIndex].tryOnSessions}</div>
              <div style={{ color: "#fcd34d" }}>Add-to-Cart: {trend[hoveredIndex].addToCart}</div>
            </div>
          )}
          <svg
            width="100%"
            height={CHART_HEIGHT}
            viewBox={`0 0 ${width} ${CHART_HEIGHT}`}
            preserveAspectRatio="none"
            style={{ display: "block" }}
          >
            <defs>
              <linearGradient id="tryOnGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.05" />
              </linearGradient>
              <linearGradient id="addToCartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.05" />
              </linearGradient>
            </defs>
            <rect
              x={CHART_PADDING.left}
              y={CHART_PADDING.top}
              width={width - CHART_PADDING.left - CHART_PADDING.right}
              height={CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom}
              fill="#f0f9ff"
              rx="4"
            />
            <line
              x1={CHART_PADDING.left}
              y1={CHART_PADDING.top}
              x2={CHART_PADDING.left}
              y2={CHART_HEIGHT - CHART_PADDING.bottom}
              stroke="#94a3b8"
              strokeWidth="1.5"
            />
            <line
              x1={CHART_PADDING.left}
              y1={CHART_HEIGHT - CHART_PADDING.bottom}
              x2={width - CHART_PADDING.right}
              y2={CHART_HEIGHT - CHART_PADDING.bottom}
              stroke="#94a3b8"
              strokeWidth="1.5"
            />
            <path
              d={`${tryOnPath} L ${scaleX(trend.length - 1)} ${CHART_HEIGHT - CHART_PADDING.bottom} L ${CHART_PADDING.left} ${CHART_HEIGHT - CHART_PADDING.bottom} Z`}
              fill="url(#tryOnGrad)"
            />
            <path
              d={`${addToCartPath} L ${scaleX(trend.length - 1)} ${CHART_HEIGHT - CHART_PADDING.bottom} L ${CHART_PADDING.left} ${CHART_HEIGHT - CHART_PADDING.bottom} Z`}
              fill="url(#addToCartGrad)"
            />
            <path
              d={tryOnPath}
              fill="none"
              stroke="#0284c7"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={addToCartPath}
              fill="none"
              stroke="#d97706"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {trend.map((_, i) => (
              <g key={i}>
                <line
                  x1={scaleX(i)}
                  y1={CHART_HEIGHT - CHART_PADDING.bottom}
                  x2={scaleX(i)}
                  y2={CHART_HEIGHT - CHART_PADDING.bottom + 6}
                  stroke="#94a3b8"
                  strokeWidth="1"
                />
                {showLabel(i) && (
                  <text
                    x={scaleX(i)}
                    y={CHART_HEIGHT - 6}
                    textAnchor="middle"
                    fill="#475569"
                    fontSize="11"
                    fontWeight="500"
                  >
                    {formatLabel(trend[i].label)}
                  </text>
                )}
              </g>
            ))}
          </svg>
            </div>
          )}
        </s-stack>
      </s-box>
    </s-section>
  );
}

export default function AnalyticsPage() {
  const data = useLoaderData<typeof loader>();
  const kpis = data?.kpis ?? defaultKpis;
  const trendDaily = data?.trendDaily ?? [];
  const trendWeekly = data?.trendWeekly ?? [];
  const topProducts = data?.topProducts ?? [];
  const gaConfig = data?.gaConfig ?? null;
  const lastEventSentAt = data?.lastEventSentAt ?? null;
  const tryOnEventsToday = data?.tryOnEventsToday ?? 0;
  const isSampleData = data?.isSampleData ?? false;
  const [chartPeriod, setChartPeriod] = useState<TrendPeriod>("daily");
  const trend = chartPeriod === "daily" ? trendDaily : trendWeekly;
  const gaFetcher = useFetcher<{ ok: boolean; connected?: boolean }>();
  const [measurementId, setMeasurementId] = useState("");
  const [propertyName, setPropertyName] = useState("");

  const isGaConnected = !!gaConfig;
  const lastEventLabel = lastEventSentAt
    ? formatTimeAgo(new Date(lastEventSentAt))
    : null;

  const inputStyle = {
    display: "block",
    marginTop: 6,
    padding: "10px 12px",
    border: "1px solid var(--p-color-border)",
    borderRadius: 8,
    minWidth: 280,
    maxWidth: 320,
    fontSize: 14,
  };

  return (
    <s-page heading="Try-On Performance Analytics">
      <div style={{ width: "100%" }}>
        {/* Google Analytics */}
        <s-section heading="Google Analytics">
          <s-box padding="large" borderWidth="base" borderRadius="base" background="subdued">
            <s-stack direction="block" gap="large">
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <s-text>Google Analytics Status</s-text>
                {isGaConnected ? (
                  <s-paragraph>Connected to GA4 property: {gaConfig.propertyName || gaConfig.measurementId}</s-paragraph>
                ) : (
                  <s-paragraph>Not connected</s-paragraph>
                )}
              </div>

              {!isGaConnected ? (
                <gaFetcher.Form method="post">
                  <input type="hidden" name="intent" value="connect" />
                  <s-stack direction="block" gap="base">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <label htmlFor="measurementId">
                        <s-text>Measurement ID (GA4)</s-text>
                      </label>
                      <input
                        id="measurementId"
                        name="measurementId"
                        type="text"
                        placeholder="G-XXXXXXX"
                        value={measurementId}
                        onChange={(e) => setMeasurementId(e.target.value)}
                        style={{ ...inputStyle, display: "inline-block", marginTop: 0, flex: "1 1 200px", maxWidth: 320 }}
                      />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <label htmlFor="propertyName">
                        <s-text>Property name (optional)</s-text>
                      </label>
                      <input
                        id="propertyName"
                        name="propertyName"
                        type="text"
                        placeholder="e.g. fashion-store-analytics"
                        value={propertyName}
                        onChange={(e) => setPropertyName(e.target.value)}
                        style={{ ...inputStyle, display: "inline-block", marginTop: 0, flex: "1 1 200px", maxWidth: 320 }}
                      />
                    </div>
                    <div style={{ marginTop: 8, width: "100%" }}>
                      <button
                        type="submit"
                        disabled={!measurementId.trim() || gaFetcher.state !== "idle"}
                        style={{
                          width: "100%",
                          padding: "10px 16px",
                          borderRadius: 8,
                          border: "none",
                          backgroundColor: "#2c6ecb",
                          color: "#fff",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Connect Google Analytics
                      </button>
                    </div>
                  </s-stack>
                </gaFetcher.Form>
              ) : (
                <s-stack direction="block" gap="large">
                  <gaFetcher.Form method="post" style={{ width: "100%" }}>
                    <input type="hidden" name="intent" value="disconnect" />
                    <button
                      type="submit"
                      style={{
                        width: "100%",
                        padding: "10px 16px",
                        borderRadius: 8,
                        border: "1px solid #8c9196",
                        backgroundColor: "#fff",
                        color: "#202223",
                        cursor: "pointer",
                      }}
                    >
                      Disconnect
                    </button>
                  </gaFetcher.Form>

                  <div>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 4 }}>
                      <s-text>Event Tracking Setup</s-text>
                    </div>
                    <s-paragraph>These events will appear in Google Analytics under Events report.</s-paragraph>
                    <div style={{ overflowX: "auto", marginTop: 12 }}>
                      <table style={tableStyle}>
                        <thead>
                          <tr>
                            <th style={{ ...thStyle, textAlign: "left" }}>Event Name</th>
                            <th style={{ ...thStyle, textAlign: "left" }}>Description</th>
                            <th style={{ ...thStyle, textAlign: "left" }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {GA_EVENTS.map((ev) => (
                            <tr key={ev.name}>
                              <td style={tdStyle}>{ev.name}</td>
                              <td style={tdStyle}>{ev.description}</td>
                              <td style={tdStyle}>{ev.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <s-text>Data Verification</s-text>
                    {lastEventLabel !== null || tryOnEventsToday > 0 ? (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                          <s-paragraph>Last Event Sent</s-paragraph>
                          <s-paragraph>{lastEventLabel ?? "—"}</s-paragraph>
                        </div>
                        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginTop: 4 }}>
                          <s-paragraph>Total Try-On Events Today</s-paragraph>
                          <s-paragraph>{tryOnEventsToday}</s-paragraph>
                        </div>
                      </div>
                    ) : (
                      <s-paragraph>No try-on events detected yet.</s-paragraph>
                    )}
                  </div>
                </s-stack>
              )}
            </s-stack>
          </s-box>
        </s-section>

        {/* KPI Overview */}
        <div style={{ marginTop: 32 }}>
          <s-section heading="KPI Overview">
          {isSampleData && (
            <div style={{ marginBottom: 12 }}>
              <s-paragraph>Sample data for demo. Connect storefront tracking to see real metrics.</s-paragraph>
            </div>
          )}
          <div style={{ display: "flex", width: "100%", gap: 20, minWidth: 0, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 200px", minWidth: 0 }}>
              <s-box padding="large" borderWidth="base" borderRadius="base" background="subdued">
                <span title="Total number of virtual try-on sessions completed by shoppers in the selected period.">
                  <s-text>Try-On Sessions</s-text>
                </span>
                <s-heading>{kpis.tryOnSessions.toLocaleString()}</s-heading>
                <s-paragraph>Last 30 days</s-paragraph>
              </s-box>
            </div>
            <div style={{ flex: "1 1 200px", minWidth: 0 }}>
              <s-box padding="large" borderWidth="base" borderRadius="base" background="subdued">
                <span title="Number of times shoppers added an item to cart after using the try-on feature.">
                  <s-text>Add-to-Cart After Try-On</s-text>
                </span>
                <s-heading>{kpis.addToCartAfterTryOn.toLocaleString()}</s-heading>
                <s-paragraph>Last 30 days</s-paragraph>
              </s-box>
            </div>
            <div style={{ flex: "1 1 200px", minWidth: 0 }}>
              <s-box padding="large" borderWidth="base" borderRadius="base" background="subdued">
                <span title="Percentage of try-on sessions that resulted in an add-to-cart. Measures how effectively try-on drives purchase intent.">
                  <s-text>Try-On → Add-to-Cart Rate</s-text>
                </span>
                <s-heading>{kpis.conversionRate}%</s-heading>
                <s-paragraph>Conversion rate</s-paragraph>
              </s-box>
            </div>
          </div>
          </s-section>
        </div>

        {/* Chart - full width */}
        <div style={{ marginTop: 32, width: "100%", minWidth: 0 }}>
          <LineChartSection
            trend={trend}
            period={chartPeriod}
            onPeriodChange={setChartPeriod}
            isSampleData={isSampleData}
          />
        </div>

        {/* Top Products */}
        <div style={{ marginTop: 32 }}>
        <s-section heading="Top Products (Try-On)">
          {topProducts.length === 0 ? (
            <s-box padding="large" background="subdued" borderRadius="base">
              <s-text>No product try-on data yet.</s-text>
            </s-box>
          ) : (
            <div style={{ overflowX: "auto", border: "1px solid var(--p-color-border-subdued)", borderRadius: 8 }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, textAlign: "left" }}>Product</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Try-On Count</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Add-to-Cart</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Conversion %</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((row) => (
                    <tr key={row.productId ?? row.productTitle}>
                      <td style={tdStyle}>{row.productTitle}</td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>{row.tryOnCount}</td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>{row.addToCartCount}</td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>{row.conversionRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </s-section>
        </div>
      </div>
    </s-page>
  );
}

const tableStyle = {
  width: "100%" as const,
  borderCollapse: "collapse" as const,
  fontSize: 14,
};
const thStyle = {
  padding: "12px 16px",
  borderBottom: "1px solid var(--p-color-border)",
  background: "var(--p-color-bg-surface-secondary)",
};
const tdStyle = {
  padding: "12px 16px",
  borderBottom: "1px solid var(--p-color-border-subdued)",
};

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
