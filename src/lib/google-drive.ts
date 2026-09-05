import { getGoogleClient } from "./google-auth";

// Confirmado via files.list com a service account: pasta compartilhada como
// Leitora, id descoberto uma vez e fixado aqui (só o arquivo de dentro muda
// toda semana, a pasta em si é estável).
const ADS_FOLDER_ID = "1ETSd7ADI38K5RsJrbcDauwyCW19yboFu";
const ADS_SHEET_NAME = "TexFlow - Google Ads Semanal";

export async function findLatestAdsSheetId(): Promise<string | null> {
  const client = await getGoogleClient(["https://www.googleapis.com/auth/drive.readonly"]);
  const res = await client.request<{ files?: { id: string; createdTime: string }[] }>({
    url: "https://www.googleapis.com/drive/v3/files",
    params: {
      q: `'${ADS_FOLDER_ID}' in parents and name = '${ADS_SHEET_NAME}' and trashed = false`,
      fields: "files(id,createdTime)",
      orderBy: "createdTime desc",
      pageSize: 1,
    },
  });
  return res.data.files?.[0]?.id ?? null;
}
