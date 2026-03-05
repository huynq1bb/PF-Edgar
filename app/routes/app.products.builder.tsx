import type { LoaderFunctionArgs } from "react-router";
import { Link } from "react-router";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function ProductsBuilderPage() {
  return (
    <div style={{ padding: "20px" }}>
      <h1>Card button builder</h1>
      <p><Link to="/app/products">← Back to Products</Link></p>
    </div>
  );
}
