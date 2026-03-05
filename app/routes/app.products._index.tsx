import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return { products: [] as { id: string; title: string }[] };
};

export default function ProductsPage() {
  const { products } = useLoaderData<typeof loader>();
  return (
    <div style={{ padding: "20px" }}>
      <h1>Products</h1>
      <p>Products ({products.length})</p>
    </div>
  );
}
