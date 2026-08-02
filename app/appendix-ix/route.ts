export function GET(request: Request) {
  return Response.redirect(new URL("/mandatory-public-disclosure", request.url), 301);
}
