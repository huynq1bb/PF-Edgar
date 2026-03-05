/**
 * Size prediction feature entry (client-safe).
 * Do not re-export loader/action here — route imports them from *.server.ts to avoid pulling server code into client bundle.
 */
export { SizePredictPage } from "./page";
export type { SizePredictLoaderData, MappingRow, ScopeType } from "./types";
