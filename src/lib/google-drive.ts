import { getGoogleClient } from "./google-auth";

// Confirmado via files.list com a service account: pasta compartilhada como
// Leitora, id descoberto uma vez e fixado aqui (a pasta em si é estável).
//
// Não filtramos por nome de arquivo de propósito — o relatório do Google Ads
// já foi recriado uma vez e o nome exportado mudou ("TexFlow - Google Ads
// Semanal" -> "TexFlow - Dashboard Semanal") sem aviso. Em vez de perseguir
// o nome certo, pegamos a planilha nativa do Google (mimeType do Sheets, não
// o .xlsx que às vezes fica na mesma pasta como artefato de exportação) mais
// recente na pasta — assumindo que só existe um relatório "atual" por vez,
// que é o próprio propósito de ter uma pasta dedicada.
const ADS_FOLDER_ID = "1ETSd7ADI38K5RsJrbcDauwyCW19yboFu";

export async function findLatestAdsSheetId(): Promise<string | null> {
  const client = await getGoogleClient(["https://www.googleapis.com/auth/drive.readonly"]);
  const res = await client.request<{ files?: { id: string; createdTime: string }[] }>({
    url: "https://www.googleapis.com/drive/v3/files",
    params: {
      q: `'${ADS_FOLDER_ID}' in parents and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`,
      fields: "files(id,createdTime)",
      orderBy: "createdTime desc",
      pageSize: 1,
    },
  });
  return res.data.files?.[0]?.id ?? null;
}
