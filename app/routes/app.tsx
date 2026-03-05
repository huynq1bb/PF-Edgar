import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";

import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  // eslint-disable-next-line no-undef
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const data = useLoaderData<typeof loader>();
  const apiKey = data?.apiKey ?? "";

  if (!apiKey) {
    return (
      <div style={{ padding: 24, fontFamily: "sans-serif", minHeight: "100%" }}>
        <p>App configuration missing (SHOPIFY_API_KEY). Check your environment.</p>
      </div>
    );
  }

  return (
    <AppProvider embedded apiKey={apiKey}>
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
        <s-app-nav>
          <s-link href="/app">Home</s-link>
          <s-link href="/app/customize">Customize</s-link>
          <s-link href="/app/products">Products</s-link>
          <s-link href="/app/closet">Closet</s-link>
          <s-link href="/app/additional">Additional page</s-link>
          <s-link href="/app/analytics">Analytics</s-link>
        </s-app-nav>
        <main style={{ flex: 1, minHeight: 0 }}>
          <Outlet />
        </main>
      </div>
    </AppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
