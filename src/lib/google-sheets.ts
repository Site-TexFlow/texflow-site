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

// Aliases por coluna lógica — o relatório do Google Ads já foi recriado uma
// vez e voltou com cabeçalho em português em vez de inglês, sem aviso.
// Casamos pelo texto (em qualquer um dos idiomas conhecidos), não pela
// posição, pra sobreviver tanto a reordenação quanto a essa troca de idioma.
const COLUMN_ALIASES: Record<keyof Omit<AdsRow, "day"> | "day", string[]> = {
  campaign: ["Campaign", "Campanha"],
  adGroup: ["Ad group", "Grupo de anúncios"],
  day: ["Day", "Dia"],
  cost: ["Cost", "Custo"],
  clicks: ["Clicks", "Cliques"],
  ctr: ["CTR"],
  impressions: ["Impr.", "Impr"],
  conversions: ["Conversions", "Conversões"],
};

function resolveColumns(headerRow: unknown[]): Record<keyof typeof COLUMN_ALIASES, number> | null {
  const header = headerRow.map((c) => String(c ?? ""));
  const find = (aliases: string[]) => {
    for (const alias of aliases) {
      const idx = header.indexOf(alias);
      if (idx >= 0) return idx;
    }
    return -1;
  };
  const cols = {
    campaign: find(COLUMN_ALIASES.campaign),
    adGroup: find(COLUMN_ALIASES.adGroup),
    day: find(COLUMN_ALIASES.day),
    cost: find(COLUMN_ALIASES.cost),
    clicks: find(COLUMN_ALIASES.clicks),
    ctr: find(COLUMN_ALIASES.ctr),
    impressions: find(COLUMN_ALIASES.impressions),
    conversions: find(COLUMN_ALIASES.conversions),
  };
  return Object.values(cols).every((i) => i >= 0) ? cols : null;
}

export async function getAdsSheetRows(spreadsheetId: string): Promise<AdsRow[]> {
  const client = await getGoogleClient(["https://www.googleapis.com/auth/spreadsheets.readonly"]);

  // Não assume mais o nome da aba ("Página1") — o relatório recriado usa o
  // próprio nome do arquivo como nome de aba. Pega a primeira aba, seja qual
  // for o nome.
  const meta = await client.request<{ sheets?: { properties: { title: string } }[] }>({
    url: `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
    params: { fields: "sheets.properties" },
  });
  const tabName = meta.data.sheets?.[0]?.properties.title;
  if (!tabName) return [];

  const res = await client.request<{ values?: unknown[][] }>({
    url: `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`'${tabName}'!A1:Z2000`)}`,
    params: { valueRenderOption: "UNFORMATTED_VALUE" },
  });
  const allRows = res.data.values ?? [];

  // O relatório às vezes prefixa a planilha com 1-2 linhas de título/período
  // antes do cabeçalho real (mudou assim na mesma recriação que trocou o
  // idioma) — procura nas primeiras linhas qual delas realmente bate com as
  // colunas esperadas, em vez de assumir que é sempre a linha 1.
  let headerRowIndex = -1;
  let columns: ReturnType<typeof resolveColumns> = null;
  for (let i = 0; i < Math.min(allRows.length, 10); i++) {
    const candidate = resolveColumns(allRows[i]);
    if (candidate) {
      headerRowIndex = i;
      columns = candidate;
      break;
    }
  }
  if (!columns) return [];

  return allRows
    .slice(headerRowIndex + 1)
    .map((r) => ({
      campaign: String(r[columns.campaign] ?? ""),
      adGroup: String(r[columns.adGroup] ?? ""),
      day: String(r[columns.day] ?? ""),
      cost: Number(r[columns.cost] ?? 0),
      clicks: Number(r[columns.clicks] ?? 0),
      ctr: Number(r[columns.ctr] ?? 0),
      impressions: Number(r[columns.impressions] ?? 0),
      conversions: Number(r[columns.conversions] ?? 0),
    }))
    // A aba costuma vir com 1000+ linhas, a maioria vazia além do dado real.
    .filter((r) => r.campaign && r.day);
}
