export const PROGRAMMES_PUBLICATION_ROUTES = [
  "/school/academics",
  "/junior-college",
  "/programmes/jee-neet",
] as const;

export type ProgrammesPublicationRoute = (typeof PROGRAMMES_PUBLICATION_ROUTES)[number];

const routeSet = new Set<string>(PROGRAMMES_PUBLICATION_ROUTES);

export function isProgrammesPublicationRoute(path: string): path is ProgrammesPublicationRoute {
  return routeSet.has(path);
}

export const PROGRAMME_ID_BY_ROUTE: Record<ProgrammesPublicationRoute, string> = {
  "/school/academics": "school-academics",
  "/junior-college": "junior-college",
  "/programmes/jee-neet": "jee-neet",
};
