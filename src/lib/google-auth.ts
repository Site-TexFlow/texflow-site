import { GoogleAuth } from "google-auth-library";

// Lido direto de process.env (e não via astro:env/server) de propósito: o
// valor é o mesmo em runtime nos dois casos (Astro/Vercel só expõe secrets
// via process.env por baixo dos panos), mas ler direto permite reaproveitar
// este helper — e por tabela google-drive.ts/google-sheets.ts, que
// dependem dele — em scripts standalone (ex: scripts/sync-ads-snapshot.ts,
// rodado fora do Astro pelo GitHub Actions), sem precisar do pipeline do
// Vite/Astro só para resolver a env var.
export async function getGoogleClient(scopes: string[]) {
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!key) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_KEY não está definida no ambiente. No site (Vercel) é uma env var normal; " +
        "em scripts locais/CI, defina antes de rodar (ex: variável de ambiente ou secret do GitHub Actions).",
    );
  }
  const credentials = JSON.parse(key);
  const auth = new GoogleAuth({ credentials, scopes });
  return auth.getClient();
}
