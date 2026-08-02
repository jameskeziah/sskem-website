import { institutionPathways } from "@/app/data/navigation";
import { siteFacts } from "@/app/data/site";
import Link from "next/link";

const footerGroups = [
  {
    title: "School",
    links: [
      { label: "Overview", href: "/school" },
      { label: "Academics", href: "/school/academics" },
      { label: "Faculty", href: "/school/faculty" },
      { label: "Facilities", href: "/school/facilities" },
    ],
  },
  {
    title: "Admissions",
    links: [
      { label: "Admissions overview", href: "/admissions" },
      { label: "Admission process", href: "/admissions/process" },
      { label: "Age criteria", href: "/admissions/age-criteria" },
      { label: "Documents required", href: "/admissions/documents-required" },
      { label: "Enquire now", href: "/admissions/enquire" },
      { label: "Application status", href: "/admissions/application-status" },
    ],
  },
  {
    title: "Compliance and Documents",
    links: [
      { label: "Mandatory Public Disclosure", href: "/mandatory-public-disclosure" },
      { label: "Document archive", href: "/documents" },
      { label: "Historical versions", href: "/documents/archive" },
      { label: "Contact", href: "/contact" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="page-container site-footer__grid">
        <div className="site-footer__identity">
          <p className="eyebrow">Established in Veral</p>
          <h2>{siteFacts.shortName}</h2>
          <p>{siteFacts.name}<br />{siteFacts.location}</p>
          <p><a href={`tel:${siteFacts.phone.replace(/\s/g, "")}`}>{siteFacts.phone}</a><br /><a href={`mailto:${siteFacts.email}`}>{siteFacts.email}</a></p>
          <p className="caption">{siteFacts.workingHours.weekdays}<br />{siteFacts.workingHours.saturday}</p>
        </div>
        {footerGroups.map((group) => (
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
      <div className="page-container site-footer__pathways" aria-label="Institutional pathway status">
        <span>Institutional pathways</span>
        {institutionPathways.map((pathway) => pathway.status === "active" ? (
          <Link href={pathway.href} key={pathway.href}>{pathway.label} · confirmed</Link>
        ) : (
          <span className="site-footer__pathway-pending" key={pathway.href}>{pathway.label} · confirmation pending</span>
        ))}
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
