import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function AnalyticsAIInsightsPage() {
  return (
    <div style={{ padding: "20px" }}>
      <h1>AI Insights</h1>
      <p>AI Insights</p>
    </div>
  );
}
