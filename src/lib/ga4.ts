import { getGoogleClient } from "./google-auth";

// Property ID confirmado pelo Bruno (GA4 > Admin > Configurações da
// propriedade) — diferente do ID do stream (5411827270). A Analytics Admin
// API segue desabilitada no projeto GCP, mas não é necessária pra isso: a
// Data API (runReport, usada abaixo) é um produto separado e já funciona.
const GA4_PROPERTY_ID = "383885126";

export interface Ga4Report {
  dimensionHeaders: Array<{ name: string }>;
  metricHeaders: Array<{ name: string }>;
  rows?: Array<{
    dimensionValues: Array<{ value: string }>;
    metricValues: Array<{ value: string }>;
  }>;
}

export async function getGa4Report(opts: {
  startDate: string;
  endDate: string;
  metrics: string[];
  dimensions?: string[];
  dimensionFilter?: Record<string, unknown>;
  orderByMetric?: string;
  limit?: number;
}): Promise<Ga4Report> {
  if (!GA4_PROPERTY_ID) {
    throw new Error("GA4_PROPERTY_ID ainda não configurado — ver comentário no topo deste arquivo.");
  }
  const client = await getGoogleClient(["https://www.googleapis.com/auth/analytics.readonly"]);
  const res = await client.request<Ga4Report>({
    url: `https://analyticsdata.googleapis.com/v1beta/properties/${GA4_PROPERTY_ID}:runReport`,
    method: "POST",
    data: {
      dateRanges: [{ startDate: opts.startDate, endDate: opts.endDate }],
      metrics: opts.metrics.map((name) => ({ name })),
      dimensions: (opts.dimensions ?? []).map((name) => ({ name })),
      ...(opts.dimensionFilter ? { dimensionFilter: opts.dimensionFilter } : {}),
      ...(opts.orderByMetric ? { orderBys: [{ metric: { metricName: opts.orderByMetric }, desc: true }] } : {}),
      ...(opts.limit ? { limit: opts.limit } : {}),
    },
  });
  return res.data;
}
