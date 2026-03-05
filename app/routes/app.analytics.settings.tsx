import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function AnalyticsSettingsPage() {
  return (
    <div style={{ padding: "20px" }}>
      <h1>Settings</h1>
      <p>Settings</p>
    </div>
  );
}
