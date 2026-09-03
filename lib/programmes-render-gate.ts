import type { createProgrammesImplementationPlan } from "./programmes-publication.ts";
import { isIssuedProgrammesImplementationPlan } from "./programmes-publication.ts";
import {
  isProgrammesPublicationRoute,
  type ProgrammesPublicationRoute,
} from "./programmes-publication-routes.ts";

type ProgrammesImplementationPlan = ReturnType<typeof createProgrammesImplementationPlan>;
type Sha256Digest = `sha256:${string}`;

const digestPattern = /^sha256:[a-f0-9]{64}$/;
const issuedRenderGates = new WeakSet<object>();

export type ApprovedProgrammeRenderGate = Readonly<{
  route: ProgrammesPublicationRoute;
  packageDigest: Sha256Digest;
  routeDigest: Sha256Digest;
}>;

function isSha256Digest(value: unknown): value is Sha256Digest {
  return typeof value === "string" && digestPattern.test(value);
}

/**
 * Issues the only token accepted by the Programme component system.
 *
 * A copied object or a hand-authored `publicationReady: true` value is not a
 * render gate. The token must come from the exact, immutable implementation
 * plan produced by the publication validator in this process.
 */
export function issueApprovedProgrammeRenderGate(
  plan: ProgrammesImplementationPlan,
  route: ProgrammesPublicationRoute,
): ApprovedProgrammeRenderGate | null {
  if (!isIssuedProgrammesImplementationPlan(plan) || !isProgrammesPublicationRoute(route)) return null;

  const routePlan = plan.routes[route];
  const packageDigest = plan.package.packageDigest;
  const routeDigest = routePlan?.routeDigest;
  const receiptPackageDigest = plan.receipt.packageDigest?.value;
  const receiptRouteDigest = plan.receipt.routeDigests[route];

  if (
    routePlan?.publicationReady !== true
    || routePlan.currentPublicationStatus !== "READY"
    || plan.receipt.routes[route] !== "ready"
    || !isSha256Digest(packageDigest)
    || !isSha256Digest(routeDigest)
    || `sha256:${receiptPackageDigest}` !== packageDigest
    || receiptRouteDigest !== routeDigest
  ) return null;

  const gate = Object.freeze({ route, packageDigest, routeDigest });
  issuedRenderGates.add(gate);
  return gate;
}

export function isApprovedProgrammeRenderGate(
  value: unknown,
  expectedRoute?: ProgrammesPublicationRoute,
): value is ApprovedProgrammeRenderGate {
  if (value === null || typeof value !== "object" || !issuedRenderGates.has(value)) return false;
  const gate = value as ApprovedProgrammeRenderGate;
  return isProgrammesPublicationRoute(gate.route)
    && (!expectedRoute || gate.route === expectedRoute)
    && isSha256Digest(gate.packageDigest)
    && isSha256Digest(gate.routeDigest);
}
