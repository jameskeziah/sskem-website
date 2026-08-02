export function GET(request: Request) {
  return Response.redirect(new URL("/admissions/enquire", request.url), 301);
}
