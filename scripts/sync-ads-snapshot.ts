// Rotina semanal (GitHub Actions, toda segunda-feira) que sincroniza os dados
// brutos do Google Ads da TexFlow para o repositório, sem intervenção manual.
//
// O que faz, em ordem:
//   1. Localiza a planilha mais recente na pasta "TexFlow - Relatórios Ads"
//      do Drive (findLatestAdsSheetId, já existente em google-drive.ts).
//   2. Lê todas as linhas dessa planilha — ela cobre uma janela de 30 dias
//      rolantes (getAdsSheetRows, já existente em google-sheets.ts).
//   3. Olha os arquivos ads-*.json já salvos em src/content/reports/ (gerados
//      por execuções anteriores desta mesma rotina) e descobre qual é o dia
//      mais recente já coberto.
//   4. Filtra da planilha só os dias posteriores a esse — normalmente ~7
//      dias, mas pode ser mais se alguma execução anterior falhou ou não
//      rodou (ex: sheet fora do ar, secret expirado etc.).
//   5. Se houver dia novo, salva um arquivo novo ads-<data-de-hoje>.json,
//      preservando granularidade dia + campanha + grupo de anúncios (para
//      permitir agregações futuras no relatório semanal). Se não houver
//      nada novo, só loga e sai sem criar arquivo vazio.
//
// Este arquivo roda fora do Astro (via tsx, no workflow do GitHub Actions),
// mas reaproveita google-drive.ts e google-sheets.ts sem modificação — só
// google-auth.ts foi ajustado para ler a service account de process.env em
// vez de astro:env/server, o que funciona igual nos dois contextos.

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { findLatestAdsSheetId } from "../src/lib/google-drive.ts";
import { getAdsSheetRows, type AdsRow } from "../src/lib/google-sheets.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = path.join(__dirname, "..", "src", "content", "reports");
const SNAPSHOT_FILENAME_RE = /^ads-(\d{4}-\d{2}-\d{2})\.json$/;

interface AdsSnapshotFile {
  generatedAt: string;
  spreadsheetId: string;
  days: string[];
  rowCount: number;
  rows: AdsRow[];
}

/** Maior "day" (YYYY-MM-DD) já salvo em qualquer ads-*.json existente, ou null se essa rotina nunca rodou. */
async function findLastSavedDay(): Promise<string | null> {
  let entries: string[];
  try {
    entries = await readdir(REPORTS_DIR);
  } catch (err: any) {
    if (err?.code === "ENOENT") return null;
    throw err;
  }

  let lastDay: string | null = null;
  for (const name of entries) {
    if (!SNAPSHOT_FILENAME_RE.test(name)) continue;
    const raw = await readFile(path.join(REPORTS_DIR, name), "utf8");
    let parsed: AdsSnapshotFile;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.warn(`Aviso: ${name} não é um JSON válido, ignorando ao calcular a última data salva.`);
      continue;
    }
    for (const row of parsed.rows ?? []) {
      if (row.day && (!lastDay || row.day > lastDay)) lastDay = row.day;
    }
  }
  return lastDay;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

async function main() {
  const spreadsheetId = await findLatestAdsSheetId();
  if (!spreadsheetId) {
    console.error(
      'Nenhuma planilha "TexFlow - Google Ads Semanal" encontrada na pasta do Drive — nada foi salvo.',
    );
    process.exitCode = 1;
    return;
  }

  const allRows = await getAdsSheetRows(spreadsheetId);
  if (allRows.length === 0) {
    console.error(`Planilha ${spreadsheetId} encontrada, mas sem nenhuma linha de dados — nada foi salvo.`);
    process.exitCode = 1;
    return;
  }

  const lastSavedDay = await findLastSavedDay();

  const newRows = allRows
    .filter((r) => r.day && (!lastSavedDay || r.day > lastSavedDay))
    .sort((a, b) => a.day.localeCompare(b.day) || a.campaign.localeCompare(b.campaign) || a.adGroup.localeCompare(b.adGroup));

  if (newRows.length === 0) {
    console.log(
      lastSavedDay
        ? `Nenhum dia novo desde ${lastSavedDay} — a planilha ainda não avançou. Nada a salvar.`
        : "Planilha sem linhas com dia preenchido — nada a salvar.",
    );
    return;
  }

  const newDays = [...new Set(newRows.map((r) => r.day))].sort();
  const outName = `ads-${todayIso()}.json`;
  const outPath = path.join(REPORTS_DIR, outName);

  const snapshot: AdsSnapshotFile = {
    generatedAt: new Date().toISOString(),
    spreadsheetId,
    days: newDays,
    rowCount: newRows.length,
    rows: newRows,
  };

  await mkdir(REPORTS_DIR, { recursive: true });
  await writeFile(outPath, JSON.stringify(snapshot, null, 2) + "\n", "utf8");

  console.log(
    `Salvo ${outName}: ${newRows.length} linha(s) cobrindo ${newDays.length} dia(s) novo(s) (${newDays[0]} a ${newDays[newDays.length - 1]}).`,
  );
}

main().catch((err) => {
  console.error("Falha ao sincronizar snapshot de Ads:", err);
  process.exitCode = 1;
});
