import { getGoogleClient } from "./google-auth";

// BLOQUEADO: a Google Analytics Admin API ainda não está habilitada no
// projeto GCP (texflow-dashboard) — sem ela não dá pra confirmar o Property
// ID real da propriedade "Texflow" por API. O ID do stream (5411827270) que
// aparece no GA4 NÃO é o Property ID; são identificadores diferentes.
// Preencher assim que soubermos o Property ID (Admin > Configurações da
// propriedade, no próprio GA4) ou a Admin API for habilitada.
const GA4_PROPERTY_ID = "";

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
    },
  });
  return res.data;
}
