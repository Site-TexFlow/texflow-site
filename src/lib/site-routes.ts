import { getCollection } from "astro:content";

// Enumera as páginas reais do site a partir da própria estrutura de rotas do
// Astro — não uma lista de exceções mantida à mão. Cobre não só as URLs
// legadas do WordPress já identificadas (/revestimentos/, /placas-de-*,
// /puncoes-e-carimbos/), mas qualquer outra URL morta que ainda apareça no
// índice do Google no futuro, sem manutenção manual.
const pageModules = import.meta.glob("/src/pages/**/*.astro", { eager: true });

function fileToRoute(filePath: string): string | null {
  let route = filePath.replace(/^\/src\/pages/, "").replace(/\.astro$/, "");
  if (route.endsWith("/index")) route = route.slice(0, -"index".length - 1);
  if (route === "") route = "/";
  if (route.includes("[")) return null; // rotas dinâmicas tratadas à parte
  if (route.startsWith("/api")) return null;
  return route;
}

let cachedRoutes: Set<string> | null = null;

export async function getValidRoutes(): Promise<Set<string>> {
  if (cachedRoutes) return cachedRoutes;

  const routes = new Set<string>();
  for (const filePath of Object.keys(pageModules)) {
    const route = fileToRoute(filePath);
    if (route) routes.add(route);
  }

  const posts = await getCollection("blog", ({ data }) => !data.draft);
  for (const post of posts) {
    routes.add(`/blog/${post.id}`);
  }

  cachedRoutes = routes;
  return routes;
}

export function isValidPath(pathname: string, validRoutes: Set<string>): boolean {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return validRoutes.has(normalized) || validRoutes.has(normalized + "/");
}

// Search Console retorna URL completa (com domínio); GA4 retorna só o path.
export function isValidSiteUrl(url: string, validRoutes: Set<string>): boolean {
  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    return false;
  }
  return isValidPath(pathname, validRoutes);
}
