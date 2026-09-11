"use client";

import { siteFacts } from "@/app/data/site";
import { usePublicationNavigation } from "@/components/navigation/publication-navigation-provider";
import Link from "next/link";

export type SiteFooterContact = {
  phone: string;
  email: string;
  location: string;
  weekdays: string;
  saturday: string;
};

const defaultContact: SiteFooterContact = {
  phone: siteFacts.phone,
  email: siteFacts.email,
  location: siteFacts.location,
  weekdays: siteFacts.workingHours.weekdays,
  saturday: siteFacts.workingHours.saturday,
};

export function SiteFooter({ contact = defaultContact }: { contact?: SiteFooterContact } = {}) {
  const { footerNavigationGroups } = usePublicationNavigation();

  return (
    <footer className="site-footer" id="site-footer" tabIndex={-1}>
      <div className="page-container site-footer__grid">
        <div className="site-footer__identity">
          <p className="eyebrow">Established in Veral</p>
          <h2>{siteFacts.shortName}</h2>
          <p>{siteFacts.name}<br />{contact.location}</p>
          <p><a href={`tel:${contact.phone.replace(/\s/g, "")}`}>{contact.phone}</a><br /><a href={`mailto:${contact.email}`}>{contact.email}</a></p>
          <p className="caption">{contact.weekdays}<br />{contact.saturday}</p>
        </div>
        {footerNavigationGroups.map((group) => (
          <nav key={group.title} aria-label={`${group.title} footer links`}>
            <h3>{group.title}</h3>
            <ul>{group.links.map((link) => <li key={link.href}><Link href={link.href}>{link.label}</Link></li>)}</ul>
          </nav>
        ))}
        <section className="site-footer__profiles" aria-labelledby="official-profiles-title">
          <h3 id="official-profiles-title">Official profiles</h3>
          <p>Social links will appear only after account ownership is verified.</p>
        </section>
      </div>
      <div className="site-footer__legal">
        <div className="page-container">
          <p>© {new Date().getFullYear()} {siteFacts.trust}. Website content owned by SSKEMS.</p>
          <nav aria-label="Legal links"><Link href="/privacy">Privacy notice</Link><Link href="/accessibility">Accessibility statement</Link></nav>
        </div>
      </div>
    </footer>
  );
}
