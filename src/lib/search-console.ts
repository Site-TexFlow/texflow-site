import { getGoogleClient } from "./google-auth";

// Confirmado via sites.list com a service account texflow-dashboard-reader —
// propriedade é URL-prefix (não domain property), com "www." fora da URL.
const SITE_URL = "https://texflow.com.br/";

export interface SearchAnalyticsRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export async function getSearchAnalytics(opts: {
  startDate: string;
  endDate: string;
  dimensions: Array<"query" | "page" | "date" | "country" | "device">;
  rowLimit?: number;
}): Promise<SearchAnalyticsRow[]> {
  const client = await getGoogleClient(["https://www.googleapis.com/auth/webmasters.readonly"]);
  const res = await client.request<{ rows?: SearchAnalyticsRow[] }>({
    url: `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE_URL)}/searchAnalytics/query`,
    method: "POST",
    data: {
      startDate: opts.startDate,
      endDate: opts.endDate,
      dimensions: opts.dimensions,
      rowLimit: opts.rowLimit ?? 10,
    },
  });
  return res.data.rows ?? [];
}
