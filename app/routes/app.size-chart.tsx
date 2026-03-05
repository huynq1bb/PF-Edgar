/**
 * Route: AI Size Predict admin page.
 * All logic and UI live in app/size-predict/; this file only wires the route.
 */
import type { HeadersFunction } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { SizePredictPage } from "../size-predict";
import { sizePredictLoader } from "../size-predict/loader.server";
import { sizePredictAction } from "../size-predict/action.server";

export const loader = sizePredictLoader;
export const action = sizePredictAction;
export default SizePredictPage;

export const headers: HeadersFunction = (headersArgs: Parameters<HeadersFunction>[0]) => {
  return boundary.headers(headersArgs);
};
