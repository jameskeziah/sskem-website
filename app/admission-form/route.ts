export function GET(request: Request) {
  return Response.redirect(new URL("/admissions/apply", request.url), 301);
}
