import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
};

export default function TryOnEventsApi() {
  return null;
}
