import { GoogleAuth } from "google-auth-library";
import { GOOGLE_SERVICE_ACCOUNT_KEY } from "astro:env/server";

export async function getGoogleClient(scopes: string[]) {
  const credentials = JSON.parse(GOOGLE_SERVICE_ACCOUNT_KEY);
  const auth = new GoogleAuth({ credentials, scopes });
  return auth.getClient();
}
