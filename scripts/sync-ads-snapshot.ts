// Rotina semanal (GitHub Actions, toda segunda-feira) que sincroniza os dados
// brutos do Google Ads da TexFlow para o repositório, sem intervenção manual.
//
// O que faz, em ordem:
//   1. Localiza a planilha mais recente na pasta "TexFlow - Relatórios Ads"
//      do Drive (findLatestAdsSheetId, já existente em google-drive.ts).
//   2. Lê todas as linhas dessa planilha — ela cobre uma janela de 30 dias
//      rolantes (getAdsSheetRows, já existente em google-sheets.ts).
//   3. Descarta qualquer linha cuja campanha não comece com
//      EXPECTED_CAMPAIGN_PREFIX (proteção contra o relatório voltar a somar
//      dado de outra conta — ver comentário na constante) e avisa via
//      console.warn().
//   4. Olha os arquivos ads-*.json já salvos em src/content/reports/ (gerados
//      por execuções anteriores desta mesma rotina) e descobre qual é o dia
//      mais recente já coberto.
//   5. Filtra da planilha só os dias posteriores a esse — normalmente ~7
//      dias, mas pode ser mais se alguma execução anterior falhou ou não
//      rodou (ex: sheet fora do ar, secret expirado etc.). Com a flag
//      --full (só uso manual/pontual), ignora essa checagem e resincroniza
//      tudo que existe na planilha no momento.
//   6. Se houver dia novo, salva um arquivo novo ads-<data-de-hoje>.json,
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

// Prefixo esperado no nome de toda campanha da TexFlow. Existe porque o
// relatório do Google Ads já foi criado por engano dentro do contexto da
// conta MCC uma vez, e nesse modo ele soma campanhas de OUTRAS contas
// gerenciadas junto (ex: "Rede de Pesquisa - Leads #2", de outro cliente).
// O relatório foi corrigido na origem, mas esta é a segunda camada de
// proteção — se a nomenclatura de campanha mudar de propósito no futuro,
// atualize esta constante.
const EXPECTED_CAMPAIGN_PREFIX = "[2026][BW][PESQUISA]";

// Ignora a checagem de "só dias novos" e resincroniza tudo que existe hoje
// na planilha — usado uma vez para resgatar um snapshot salvo quando a
// planilha ainda estava com o bug do MCC/período curto (ver commit).
const FORCE_FULL_RESYNC = process.argv.includes("--full");

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

/**
 * Mantém só linhas de campanhas da TexFlow (prefixo esperado) e descarta o
 * resto — proteção contra o relatório voltar a somar dado de outra conta
 * (ex: se alguém recriar o relatório de dentro do MCC por engano de novo).
 * Emite um warn por nome de campanha estranha encontrada (uma vez cada,
 * mesmo que apareça em várias linhas/dias), pra aparecer bem visível nos
 * logs do GitHub Actions.
 */
function filterValidCampaignRows(rows: AdsRow[]): AdsRow[] {
  const valid: AdsRow[] = [];
  const warnedCampaigns = new Set<string>();
  for (const row of rows) {
    if (row.campaign.startsWith(EXPECTED_CAMPAIGN_PREFIX)) {
      valid.push(row);
      continue;
    }
    if (!warnedCampaigns.has(row.campaign)) {
      warnedCampaigns.add(row.campaign);
      console.warn(
        `⚠️  ATENÇÃO: campanha fora do esperado na planilha, IGNORADA: "${row.campaign}" ` +
          `(esperado prefixo "${EXPECTED_CAMPAIGN_PREFIX}"). Verifique se o relatório do Google Ads ` +
          "não voltou a ser gerado no contexto de outra conta (MCC).",
      );
    }
  }
  return valid;
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

  const rawRows = await getAdsSheetRows(spreadsheetId);
  if (rawRows.length === 0) {
    console.error(`Planilha ${spreadsheetId} encontrada, mas sem nenhuma linha de dados — nada foi salvo.`);
    process.exitCode = 1;
    return;
  }

  const allRows = filterValidCampaignRows(rawRows);
  if (allRows.length === 0) {
    console.error(
      `Todas as ${rawRows.length} linha(s) da planilha ${spreadsheetId} foram descartadas pelo filtro ` +
        `de campanha (nenhuma começa com "${EXPECTED_CAMPAIGN_PREFIX}") — nada foi salvo. Verifique a ` +
        "configuração do relatório no Google Ads.",
    );
    process.exitCode = 1;
    return;
  }

  const lastSavedDay = FORCE_FULL_RESYNC ? null : await findLastSavedDay();
  if (FORCE_FULL_RESYNC) {
    console.log("Modo --full: ignorando o último dia salvo, resincronizando tudo que existe na planilha agora.");
  }

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
