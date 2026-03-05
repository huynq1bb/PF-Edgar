import { Links, Meta, Outlet, Scripts, ScrollRestoration, useRouteError } from "react-router";

export default function App() {
  return (
    <html lang="en" style={{ height: "100%" }}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <Meta />
        <Links />
      </head>
      <body style={{ margin: 0, minHeight: "100%", height: "100%" }}>
        <div id="app-root" style={{ minHeight: "100%" }}>
          <Outlet />
        </div>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: unknown }).message)
        : String(error);
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <title>App Error</title>
      </head>
      <body style={{ margin: 0, padding: 24, fontFamily: "sans-serif" }}>
        <div id="app-root">
          <h2 style={{ color: "#d72c0d" }}>Something went wrong</h2>
          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{message}</pre>
        </div>
        <Scripts />
      </body>
    </html>
  );
}
