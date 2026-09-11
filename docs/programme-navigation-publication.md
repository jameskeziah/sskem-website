# Programme navigation publication

Programme discovery is fail closed. The header, mobile drawer, no-JavaScript
navigation, search suggestions, breadcrumbs, footer and sitemap are all derived
from the current approved Programme profiles.

`getPublicationNavigation(now)` is the single adapter for those surfaces. It
uses the profile navigation label and route only while `validUntil` is either
absent or on/after the current UTC calendar date. The final approved day is
inclusive; the profile is removed at the start of the following UTC day.

The root layout supplies one server-generated snapshot to the interactive
header and footer. The client provider refreshes that snapshot at each UTC date
boundary so a long-open page does not retain an expired link. Sitemap generation
uses the same adapter at request time.

When every Programme profile is unavailable, general school, admissions and
public-information navigation remains usable and the Programme footer group is
omitted. Private review workspaces may still list governed routes inside their
review content; those lists are not public publication claims.
