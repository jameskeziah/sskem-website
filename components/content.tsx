import Image, { type ImageProps } from "next/image";
import { Children, type ReactNode } from "react";
import { Heading, TextLink } from "./typography";

export function NoticeBar({ children }: { children: ReactNode }) {
  return (
    <div className="notice-bar" role="status">
      <div className="page-container notice-bar__inner">
        <span aria-hidden="true" className="notice-bar__dot" />
        <span>{children}</span>
      </div>
    </div>
  );
}

export function Alert({
  title,
  children,
  kind = "information",
}: {
  title: string;
  children: ReactNode;
  kind?: "information" | "success" | "warning" | "danger";
}) {
  return (
    <div className={`alert alert--${kind}`} role={kind === "danger" ? "alert" : "status"}>
      <strong>{title}</strong>
      <div>{children}</div>
    </div>
  );
}

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="breadcrumbs">
      <ol>
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`}>
            {item.href ? (
              <a href={item.href}>{item.label}</a>
            ) : (
              <span aria-current="page">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function ProgrammeCard({
  eyebrow,
  title,
  description,
  href,
}: {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <article className="programme-card">
      <p className="eyebrow">{eyebrow}</p>
      <Heading as="h3" level="subsection">{title}</Heading>
      <p>{description}</p>
      <TextLink href={href}>Explore {title}</TextLink>
    </article>
  );
}

type DisclosureStatus = "current" | "archived" | "verification";

export function DisclosureDocumentCard({
  title,
  category,
  academicYear,
  issuingAuthority,
  issueDate,
  expiryDate,
  fileType,
  fileSize,
  status,
  lastVerified,
  href,
}: {
  title: string;
  category: string;
  academicYear: string;
  issuingAuthority: string;
  issueDate: string;
  expiryDate: string;
  fileType: string;
  fileSize: string;
  status: DisclosureStatus;
  lastVerified: string;
  href?: string;
}) {
  const statusLabel = status === "current" ? "Current" : status === "archived" ? "Archived" : "Verification required";
  return (
    <article className="document-card">
      <div className="document-card__header">
        <span className={`status-badge status-badge--${status}`}>{statusLabel}</span>
        <span>{category}</span>
      </div>
      <Heading as="h3" level="subsection">{title}</Heading>
      <dl className="document-card__facts">
        <div><dt>Academic year</dt><dd>{academicYear}</dd></div>
        <div><dt>Authority</dt><dd>{issuingAuthority}</dd></div>
        <div><dt>Issued</dt><dd>{issueDate}</dd></div>
        <div><dt>Expires</dt><dd>{expiryDate}</dd></div>
      </dl>
      <div className="document-card__footer">
        <span>{fileType} · {fileSize}</span>
        {href ? (
          <a href={href} aria-label={`View ${title}, ${fileType}, ${fileSize}`}>View document</a>
        ) : (
          <span className="document-card__unavailable" aria-disabled="true">Download pending verification</span>
        )}
      </div>
      <small>Last verified: {lastVerified}</small>
    </article>
  );
}

export function DocumentList({ children, label = "Documents" }: { children: ReactNode; label?: string }) {
  return (
    <ul className="document-list" aria-label={label}>
      {Children.map(children, (child) => <li>{child}</li>)}
    </ul>
  );
}

export function ContactCard({
  title,
  phone,
  email,
  hours,
}: {
  title: string;
  phone: string;
  email: string;
  hours: string;
}) {
  return (
    <article className="contact-card">
      <Heading as="h3" level="subsection">{title}</Heading>
      <dl>
        <div><dt>Phone</dt><dd><a href={`tel:${phone.replace(/\s/g, "")}`}>{phone}</a></dd></div>
        <div><dt>Email</dt><dd><a href={`mailto:${email}`}>{email}</a></dd></div>
        <div><dt>Hours</dt><dd>{hours}</dd></div>
      </dl>
    </article>
  );
}

export function LeadershipCard({ name, role, message }: { name: string; role: string; message: string }) {
  return (
    <article className="person-card">
      <div className="person-card__portrait" aria-hidden="true">{name.charAt(0)}</div>
      <div>
        <Heading as="h3" level="subsection">{name}</Heading>
        <p className="caption">{role}</p>
        <p>{message}</p>
      </div>
    </article>
  );
}

export function FacultyCard({ name, department, qualification }: { name: string; department: string; qualification: string }) {
  return (
    <article className="faculty-card">
      <div className="person-card__portrait person-card__portrait--small" aria-hidden="true">{name.charAt(0)}</div>
      <Heading as="h3" level="label">{name}</Heading>
      <p>{department}</p>
      <small>{qualification}</small>
    </article>
  );
}

export function Statistic({ value, label }: { value: string; label: string }) {
  return (
    <div className="statistic">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

export function Accordion({ items }: { items: { title: string; content: ReactNode }[] }) {
  return (
    <div className="accordion">
      {items.map((item) => (
        <details key={item.title}>
          <summary>{item.title}<span aria-hidden="true">+</span></summary>
          <div className="accordion__content">{item.content}</div>
        </details>
      ))}
    </div>
  );
}

export function DataTable({
  caption,
  headers,
  rows,
}: {
  caption: string;
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="table-scroll" tabIndex={0} role="region" aria-label={`${caption}, scrollable table`}>
      <table className="data-table">
        <caption>{caption}</caption>
        <thead><tr>{headers.map((header) => <th scope="col" key={header}>{header}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={`${index}-${cellIndex}`}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

export function ResponsiveImage({ alt, ...props }: ImageProps) {
  return <Image className="responsive-image" alt={alt} unoptimized={props.unoptimized ?? true} {...props} />;
}

export function VideoEmbed({ title, src }: { title: string; src?: string }) {
  if (!src) {
    return (
      <div className="video-embed video-embed--empty" role="img" aria-label={title}>
        <span aria-hidden="true">▶</span>
        <p>Video source pending</p>
      </div>
    );
  }
  return (
    <div className="video-embed">
      <iframe title={title} src={src} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
    </div>
  );
}

export function GalleryCard({ title, meta, children }: { title: string; meta: string; children?: ReactNode }) {
  return (
    <article className="gallery-card">
      <div className="gallery-card__media">{children ?? <span aria-hidden="true">Image pending</span>}</div>
      <div className="gallery-card__body">
        <Heading as="h3" level="label">{title}</Heading>
        <p className="caption">{meta}</p>
      </div>
    </article>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="state-card">
      <span className="state-card__mark" aria-hidden="true">○</span>
      <Heading as="h3" level="subsection">{title}</Heading>
      <p>{description}</p>
    </div>
  );
}

export function ErrorState({ title, description }: { title: string; description: string }) {
  return (
    <div className="state-card state-card--error" role="alert">
      <span className="state-card__mark" aria-hidden="true">!</span>
      <Heading as="h3" level="subsection">{title}</Heading>
      <p>{description}</p>
    </div>
  );
}

export function Pagination({ current, total, baseHref }: { current: number; total: number; baseHref: string }) {
  const previous = current > 1 ? <a href={`${baseHref}?page=${current - 1}`}>Previous</a> : <span aria-disabled="true">Previous</span>;
  const next = current < total ? <a href={`${baseHref}?page=${current + 1}`}>Next</a> : <span aria-disabled="true">Next</span>;
  return (
    <nav className="pagination" aria-label="Pagination">
      {previous}
      <span>Page {current} of {total}</span>
      {next}
    </nav>
  );
}
