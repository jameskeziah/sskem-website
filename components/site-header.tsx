"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SiteImage } from "@/components/media/SiteImage";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NoticeBar, Breadcrumbs } from "./content";
import { IconButton, SearchInput } from "./controls";
import { utilityNavigation, type NavigationItem } from "@/app/data/navigation";
import { siteFacts } from "@/app/data/site";
import { useFloatingNavigationMotion } from "@/components/motion/use-floating-navigation-motion";
import { usePublicationNavigation } from "@/components/navigation/publication-navigation-provider";

export type SiteHeaderEditorial = {
  notice: {
    message: string;
    href: string | null;
    linkLabel: string;
  };
  contact: {
    phone: string;
    email: string;
  };
};

const defaultEditorial: SiteHeaderEditorial = {
  notice: {
    message: "Admissions information for 2026–27 is being verified.",
    href: "/admissions/enquire",
    linkLabel: "Enquire for current dates",
  },
  contact: {
    phone: siteFacts.phone,
    email: siteFacts.email,
  },
};

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function setPageInert(inert: boolean) {
  document.querySelectorAll<HTMLElement>("#main-content, footer, .site-header, .skip-links").forEach((element) => {
    if (inert) element.setAttribute("inert", "");
    else element.removeAttribute("inert");
  });
}

function BrandIdentity() {
  return (
    <Link className="brand-identity" href="/" aria-label={`${siteFacts.shortName} home`}>
      <span className="brand-identity__mark" aria-hidden="true">
        <SiteImage src="/sskem-logo.png" alt="" width={1498} height={586} sizes="48px" priority unoptimized />
      </span>
      <span className="brand-identity__copy">
        <strong>{siteFacts.shortName}</strong>
        <span>English Medium School · Veral</span>
      </span>
    </Link>
  );
}

function breadcrumbItems(pathname: string, primaryNavigation: NavigationItem[]) {
  if (pathname === "/") return [{ label: "Home" }];
  const segments = pathname.split("/").filter(Boolean);
  const labelsByPath = new Map(
    primaryNavigation.flatMap((item) => [
      [item.href, item.label] as const,
      ...item.children.map((child) => [child.href, child.label] as const),
    ]),
  );
  return [
    { label: "Home", href: "/" },
    ...segments.map((segment, index) => ({
      label: labelsByPath.get(`/${segments.slice(0, index + 1).join("/")}`)
        ?? segment
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" "),
      href: index < segments.length - 1 ? `/${segments.slice(0, index + 1).join("/")}` : undefined,
    })),
  ];
}

function StaticNavigationFallback({
  pathname,
  contact,
  primaryNavigation,
}: {
  pathname: string;
  contact: SiteHeaderEditorial["contact"];
  primaryNavigation: NavigationItem[];
}) {
  return (
    <details className="static-navigation-fallback">
      <summary>Open full site navigation</summary>
      <nav aria-label="Primary navigation without JavaScript">
        <div className="page-container">
          <strong>Site navigation</strong>
          <ul>
            {primaryNavigation.map((item) => (
              <li key={item.href}>
                <Link href={item.href} aria-current={pathname === item.href ? "page" : undefined}>{item.label}</Link>
                {item.children.length ? (
                  <ul>
                    {item.children.map((child) => (
                      <li key={child.href}>
                        <Link href={child.href} aria-current={pathname === child.href ? "page" : undefined}>{child.label}</Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
            {utilityNavigation.map((item) => (
              <li key={item.href}><Link href={item.href}>{item.label}</Link></li>
            ))}
          </ul>
          <div className="static-navigation-fallback__contact">
            <Link href="/admissions/enquire">Enquire now</Link>
            <a href={`tel:${contact.phone.replace(/\s/g, "")}`}>{contact.phone}</a>
            <a href={`mailto:${contact.email}`}>{contact.email}</a>
          </div>
        </div>
      </nav>
    </details>
  );
}

export function SiteHeader({
  showBreadcrumb = true,
  editorial,
}: {
  showBreadcrumb?: boolean;
  editorial?: {
    notice?: SiteHeaderEditorial["notice"] | null;
    contact?: SiteHeaderEditorial["contact"];
  };
} = {}) {
  const activeEditorial: SiteHeaderEditorial = {
    notice: editorial?.notice ?? defaultEditorial.notice,
    contact: editorial?.contact ?? defaultEditorial.contact,
  };
  const { primaryNavigation, searchableLinks } = usePublicationNavigation();
  const pathname = usePathname();
  const [openDesktop, setOpenDesktop] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const headerRef = useRef<HTMLElement>(null);
  const headerMainSlotRef = useRef<HTMLDivElement>(null);
  const headerMainRef = useRef<HTMLDivElement>(null);
  const headerNavRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const searchPanelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const submenuButtons = useRef<Record<string, HTMLButtonElement | null>>({});
  const floatingNavigation = useFloatingNavigationMotion({
    navigationRef: headerMainRef,
    slotRef: headerMainSlotRef,
    interactionLocked: Boolean(openDesktop || mobileOpen || searchOpen),
  });

  const results = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return searchableLinks.slice(0, 8);
    return searchableLinks.filter((item) => item.label.toLowerCase().includes(query)).slice(0, 8);
  }, [searchTerm, searchableLinks]);

  useEffect(() => {
    const header = headerRef.current;
    header?.setAttribute("data-navigation-enhanced", "true");
    return () => header?.removeAttribute("data-navigation-enhanced");
  }, []);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (openDesktop && headerNavRef.current && !headerNavRef.current.contains(event.target as Node)) {
        setOpenDesktop(null);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [openDesktop]);

  useEffect(() => {
    if (!openDesktop) return;
    const label = openDesktop;
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDesktopWithFocus(label);
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [openDesktop]);

  useEffect(() => {
    if (!mobileOpen) return;
    const returnButton = menuButtonRef.current;
    setPageInert(true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const first = drawerRef.current?.querySelector<HTMLElement>(focusableSelector);
    first?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileOpen(false);
        return;
      }
      if (event.key !== "Tab" || !drawerRef.current) return;
      const focusable = Array.from(drawerRef.current.querySelectorAll<HTMLElement>(focusableSelector));
      const firstItem = focusable[0];
      const lastItem = focusable.at(-1);
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem?.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      setPageInert(false);
      returnButton?.focus({ preventScroll: true });
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const returnButton = searchButtonRef.current;
    setPageInert(true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    searchInputRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setSearchOpen(false);
        return;
      }
      if (event.key !== "Tab" || !searchPanelRef.current) return;
      const focusable = Array.from(searchPanelRef.current.querySelectorAll<HTMLElement>(focusableSelector));
      const firstItem = focusable[0];
      const lastItem = focusable.at(-1);
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem?.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      setPageInert(false);
      returnButton?.focus({ preventScroll: true });
    };
  }, [searchOpen]);

  function closeDesktopWithFocus(label: string) {
    setOpenDesktop(null);
    submenuButtons.current[label]?.focus({ preventScroll: true });
  }

  function openMobileNavigation() {
    const currentSection = primaryNavigation.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
    setMobileExpanded(currentSection?.label ?? null);
    setMobileOpen(true);
  }

  function closeMobileNavigation() {
    setMobileOpen(false);
  }

  return (
    <>
      <nav className="skip-links" aria-label="Skip links">
        <a className="skip-link" href="#main-content">Skip to main content</a>
        <a className="skip-link" href="#site-footer">Skip to footer</a>
      </nav>
      <header ref={headerRef} className="site-header">
        <NoticeBar>
          {activeEditorial.notice.message}{activeEditorial.notice.href ? (
            <> <Link href={activeEditorial.notice.href}>{activeEditorial.notice.linkLabel}</Link>.</>
          ) : null}
        </NoticeBar>

        <div className="utility-bar">
          <div className="page-container utility-bar__inner">
            <nav aria-label="Utility navigation">
              <ul>
                {utilityNavigation.map((item) => (
                  <li key={item.href}><Link href={item.href} aria-current={pathname === item.href ? "page" : undefined}>{item.label}</Link></li>
                ))}
              </ul>
            </nav>
            <button ref={searchButtonRef} className="utility-search" type="button" onClick={() => setSearchOpen(true)}>
              <span aria-hidden="true">⌕</span> Search
            </button>
          </div>
        </div>

        <div ref={headerMainSlotRef} className="header-main-slot">
          <div
            ref={headerMainRef}
            className="header-main page-container"
            data-floating={floatingNavigation.isFloating}
            data-visible={floatingNavigation.isVisible}
          >
          <BrandIdentity />
          <nav ref={headerNavRef} className="desktop-navigation" aria-label="Primary navigation" data-primary-nav>
            <ul>
              {primaryNavigation.map((item) => {
                const open = openDesktop === item.label;
                const controlId = `desktop-${item.label.toLowerCase().replace(/\s/g, "-")}`;
                return (
                  <li className="desktop-navigation__item" key={item.href}>
                    <div className="desktop-navigation__entry" data-section-current={pathname === item.href || pathname.startsWith(`${item.href}/`) || undefined}>
                      <Link href={item.href} aria-current={pathname === item.href ? "page" : undefined}>{item.label}</Link>
                      {item.children.length ? (
                        <button
                          ref={(node) => { submenuButtons.current[item.label] = node; }}
                          type="button"
                          aria-label={`Show ${item.label} links`}
                          aria-expanded={open}
                          aria-controls={controlId}
                          onClick={() => setOpenDesktop(open ? null : item.label)}
                          onKeyDown={(event) => {
                            if (event.key === "Escape") {
                              event.preventDefault();
                              closeDesktopWithFocus(item.label);
                            }
                          }}
                        >
                          <span aria-hidden="true">⌄</span>
                        </button>
                      ) : null}
                    </div>
                    {item.children.length ? (
                      <div className="desktop-submenu" id={controlId} hidden={!open}>
                        <ul>
                          {item.children.map((child) => (
                            <li key={child.href}>
                              <Link href={child.href} aria-current={pathname === child.href ? "page" : undefined} onKeyDown={(event) => {
                                if (event.key === "Escape") {
                                  event.preventDefault();
                                  closeDesktopWithFocus(item.label);
                                }
                              }}>
                                <strong>{child.label}</strong>
                                <span>{child.description}</span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </nav>
          <Link className="button button--primary header-cta" href="/admissions/apply">Apply for Admission</Link>
          <IconButton ref={menuButtonRef} className="mobile-menu-button" label="Open navigation" onClick={openMobileNavigation}>
            <span aria-hidden="true">☰</span>
          </IconButton>
          </div>
        </div>

        {showBreadcrumb ? (
          <div className="breadcrumb-bar">
            <div className="page-container"><Breadcrumbs items={breadcrumbItems(pathname, primaryNavigation)} /></div>
          </div>
        ) : null}
        <StaticNavigationFallback
          pathname={pathname}
          contact={activeEditorial.contact}
          primaryNavigation={primaryNavigation}
        />
      </header>

      {mobileOpen ? (
        <div className="mobile-drawer-layer" role="presentation">
          <button className="mobile-drawer-backdrop" aria-label="Close navigation" onClick={closeMobileNavigation} />
          <div className="mobile-drawer" ref={drawerRef} role="dialog" aria-modal="true" aria-labelledby="mobile-navigation-title" aria-describedby="mobile-navigation-description">
            <h2 className="visually-hidden" id="mobile-navigation-title">Site navigation</h2>
            <p className="visually-hidden" id="mobile-navigation-description">Choose a section or press Escape to close this menu.</p>
            <div className="mobile-drawer__header">
              <BrandIdentity />
              <IconButton label="Close navigation" onClick={closeMobileNavigation}><span aria-hidden="true">×</span></IconButton>
            </div>
            <button className="mobile-search-trigger" type="button" onClick={() => { setMobileOpen(false); setSearchOpen(true); }}>
              <span aria-hidden="true">⌕</span> Search the website
            </button>
            <nav aria-label="Mobile primary navigation" className="mobile-navigation">
              <ul>
                {primaryNavigation.map((item) => {
                  const expanded = mobileExpanded === item.label;
                  const controlId = `mobile-${item.label.toLowerCase().replace(/\s/g, "-")}`;
                  return (
                    <li key={item.href}>
                      <div className="mobile-navigation__entry" data-section-current={pathname === item.href || pathname.startsWith(`${item.href}/`) || undefined}>
                        <Link href={item.href} aria-current={pathname === item.href ? "page" : undefined} onClick={closeMobileNavigation}>{item.label}</Link>
                        {item.children.length ? (
                          <button type="button" aria-label={`${expanded ? "Hide" : "Show"} ${item.label} links`} aria-expanded={expanded} aria-controls={controlId} onClick={() => setMobileExpanded(expanded ? null : item.label)}>
                            <span aria-hidden="true">{expanded ? "−" : "+"}</span>
                          </button>
                        ) : null}
                      </div>
                      {item.children.length ? (
                        <ul id={controlId} hidden={!expanded}>
                          {item.children.map((child) => <li key={child.href}><Link href={child.href} aria-current={pathname === child.href ? "page" : undefined} onClick={closeMobileNavigation}>{child.label}</Link></li>)}
                        </ul>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </nav>
            <div className="mobile-drawer__utility">
              {utilityNavigation.map((item) => <Link href={item.href} key={item.href} aria-current={pathname === item.href ? "page" : undefined} onClick={closeMobileNavigation}>{item.label}</Link>)}
              <a href={`tel:${activeEditorial.contact.phone.replace(/\s/g, "")}`}>{activeEditorial.contact.phone}</a>
              <a href={`mailto:${activeEditorial.contact.email}`}>{activeEditorial.contact.email}</a>
            </div>
            <Link className="button button--primary button--full" href="/admissions/apply" onClick={closeMobileNavigation}>Apply for Admission</Link>
          </div>
        </div>
      ) : null}

      {searchOpen ? (
        <div className="search-layer" role="presentation">
          <button className="search-backdrop" aria-label="Close search" onClick={() => setSearchOpen(false)} />
          <div className="search-panel" ref={searchPanelRef} role="dialog" aria-modal="true" aria-labelledby="search-title">
            <div className="search-panel__header">
              <div><p className="eyebrow">Site search</p><h2 id="search-title">What are you looking for?</h2></div>
              <IconButton label="Close search" onClick={() => setSearchOpen(false)}><span aria-hidden="true">×</span></IconButton>
            </div>
            <label className="visually-hidden" htmlFor="site-search">Search pages</label>
            <SearchInput ref={searchInputRef} id="site-search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Try admissions, calendar or documents" />
            <div className="search-results" aria-live="polite">
              <p className="caption">{results.length} suggested {results.length === 1 ? "page" : "pages"}</p>
              <ul>{results.map((item) => <li key={item.href}><Link href={item.href} onClick={() => setSearchOpen(false)}>{item.label}<span aria-hidden="true">→</span></Link></li>)}</ul>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
