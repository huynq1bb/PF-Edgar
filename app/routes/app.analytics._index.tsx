import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function AnalyticsOverviewPage() {
  return (
    <div style={{ padding: "20px" }}>
      <h1>Analytics</h1>
      <p>Overview</p>
    </div>
  );
}
