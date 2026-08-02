"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NoticeBar, Breadcrumbs } from "./content";
import { IconButton, SearchInput } from "./controls";
import { primaryNavigation, searchableLinks, utilityNavigation } from "@/app/data/navigation";
import { siteFacts } from "@/app/data/site";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function setPageInert(inert: boolean) {
  document.querySelectorAll<HTMLElement>("#main-content, footer, .site-header").forEach((element) => {
    if (inert) element.setAttribute("inert", "");
    else element.removeAttribute("inert");
  });
}

function BrandIdentity() {
  return (
    <Link className="brand-identity" href="/" aria-label={`${siteFacts.shortName} home`}>
      <span className="brand-identity__mark" aria-hidden="true">
        <Image src="/sskem-logo.png" alt="" width={1498} height={586} sizes="48px" priority unoptimized />
      </span>
      <span className="brand-identity__copy">
        <strong>{siteFacts.shortName}</strong>
        <span>English Medium School · CBSE</span>
      </span>
    </Link>
  );
}

function breadcrumbItems(pathname: string) {
  if (pathname === "/") return [{ label: "Home" }];
  const segments = pathname.split("/").filter(Boolean);
  return [
    { label: "Home", href: "/" },
    ...segments.map((segment, index) => ({
      label: segment
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" "),
      href: index < segments.length - 1 ? `/${segments.slice(0, index + 1).join("/")}` : undefined,
    })),
  ];
}

export function SiteHeader() {
  const pathname = usePathname();
  const [openDesktop, setOpenDesktop] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const headerNavRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const searchPanelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const submenuButtons = useRef<Record<string, HTMLButtonElement | null>>({});

  const results = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return searchableLinks.slice(0, 8);
    return searchableLinks.filter((item) => item.label.toLowerCase().includes(query)).slice(0, 8);
  }, [searchTerm]);

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

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="site-header">
        <NoticeBar>
          Admissions information for 2026–27 is being verified. <Link href="/admissions/enquire">Enquire for current dates</Link>.
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

        <div className="header-main page-container">
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
                    </div>
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
                  </li>
                );
              })}
            </ul>
          </nav>
          <Link className="button button--primary header-cta" href="/admissions/enquire">Enquire now</Link>
          <IconButton ref={menuButtonRef} className="mobile-menu-button" label="Open navigation" onClick={() => setMobileOpen(true)}>
            <span aria-hidden="true">☰</span>
          </IconButton>
        </div>

        <div className="breadcrumb-bar">
          <div className="page-container"><Breadcrumbs items={breadcrumbItems(pathname)} /></div>
        </div>
      </header>

      {mobileOpen ? (
        <div className="mobile-drawer-layer" role="presentation">
          <button className="mobile-drawer-backdrop" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />
          <div className="mobile-drawer" ref={drawerRef} role="dialog" aria-modal="true" aria-label="Site navigation">
            <div className="mobile-drawer__header">
              <BrandIdentity />
              <IconButton label="Close navigation" onClick={() => setMobileOpen(false)}><span aria-hidden="true">×</span></IconButton>
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
                        <Link href={item.href} aria-current={pathname === item.href ? "page" : undefined}>{item.label}</Link>
                        <button type="button" aria-label={`Show ${item.label} links`} aria-expanded={expanded} aria-controls={controlId} onClick={() => setMobileExpanded(expanded ? null : item.label)}>
                          <span aria-hidden="true">{expanded ? "−" : "+"}</span>
                        </button>
                      </div>
                      <ul id={controlId} hidden={!expanded}>
                        {item.children.map((child) => <li key={child.href}><Link href={child.href} aria-current={pathname === child.href ? "page" : undefined}>{child.label}</Link></li>)}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            </nav>
            <div className="mobile-drawer__utility">
              {utilityNavigation.map((item) => <Link href={item.href} key={item.href}>{item.label}</Link>)}
              <a href={`tel:${siteFacts.phone.replace(/\s/g, "")}`}>{siteFacts.phone}</a>
              <a href={`mailto:${siteFacts.email}`}>{siteFacts.email}</a>
            </div>
            <Link className="button button--primary button--full" href="/admissions/enquire">Enquire now</Link>
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
            <SearchInput ref={searchInputRef} id="site-search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Try admissions, calendar or faculty" />
            <div className="search-results" aria-live="polite">
              <p className="caption">{results.length} suggested {results.length === 1 ? "page" : "pages"}</p>
              <ul>{results.map((item) => <li key={item.href}><Link href={item.href}>{item.label}<span aria-hidden="true">→</span></Link></li>)}</ul>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
