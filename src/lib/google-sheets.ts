import { getGoogleClient } from "./google-auth";

export interface AdsRow {
  campaign: string;
  adGroup: string;
  day: string; // "YYYY-MM-DD"
  cost: number;
  clicks: number;
  ctr: number; // fração (0.1071 = 10,71%)
  impressions: number;
  conversions: number;
}

// Nomes de coluna confirmados lendo a planilha real — em inglês (export
// nativo do Google Ads), não os nomes em português do pedido original, e com
// uma coluna extra ("Currency code") que ignoramos. Casamos pelo texto do
// cabeçalho, não pela posição, pra não quebrar se a ordem mudar.
export async function getAdsSheetRows(spreadsheetId: string): Promise<AdsRow[]> {
  const client = await getGoogleClient(["https://www.googleapis.com/auth/spreadsheets.readonly"]);
  const res = await client.request<{ values?: unknown[][] }>({
    url: `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent("'Página1'!A1:Z10000")}`,
    params: { valueRenderOption: "UNFORMATTED_VALUE" },
  });

  const rows = res.data.values ?? [];
  if (rows.length < 2) return [];

  const header = rows[0] as string[];
  const col = (name: string) => header.indexOf(name);
  const iCampaign = col("Campaign");
  const iAdGroup = col("Ad group");
  const iDay = col("Day");
  const iCost = col("Cost");
  const iClicks = col("Clicks");
  const iCtr = col("CTR");
  const iImpr = col("Impr.");
  const iConv = col("Conversions");

  return rows.slice(1).map((r) => ({
    campaign: String(r[iCampaign] ?? ""),
    adGroup: String(r[iAdGroup] ?? ""),
    day: String(r[iDay] ?? ""),
    cost: Number(r[iCost] ?? 0),
    clicks: Number(r[iClicks] ?? 0),
    ctr: Number(r[iCtr] ?? 0),
    impressions: Number(r[iImpr] ?? 0),
    conversions: Number(r[iConv] ?? 0),
  }));
}
