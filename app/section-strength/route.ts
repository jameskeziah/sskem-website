export function GET(request: Request) {
  return Response.redirect(new URL("/admissions/age-criteria", request.url), 301);
}
