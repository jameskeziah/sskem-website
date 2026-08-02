export function GET(request: Request) {
  return Response.redirect(new URL("/admissions/process", request.url), 301);
}
