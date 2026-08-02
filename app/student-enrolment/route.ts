export function GET(request: Request) {
  return Response.redirect(new URL("/admissions", request.url), 301);
}
