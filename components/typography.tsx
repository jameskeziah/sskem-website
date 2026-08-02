import type { AnchorHTMLAttributes, HTMLAttributes, ReactNode } from "react";

type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export function Heading({
  as: Tag = "h2",
  level = "section",
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement> & {
  as?: HeadingTag;
  level?: "display" | "page" | "section" | "subsection" | "label";
  children: ReactNode;
}) {
  return (
    <Tag className={`heading heading--${level} ${className}`.trim()} {...props}>
      {children}
    </Tag>
  );
}

export function Text({ className = "", children, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={`text ${className}`.trim()} {...props}>
      {children}
    </p>
  );
}

export function Lead({ className = "", children, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={`lead ${className}`.trim()} {...props}>
      {children}
    </p>
  );
}

export function Eyebrow({ className = "", children, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={`eyebrow ${className}`.trim()} {...props}>
      {children}
    </p>
  );
}

export function Caption({ className = "", children, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={`caption ${className}`.trim()} {...props}>
      {children}
    </p>
  );
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
};

export function TextLink({ className = "", children, ...props }: LinkProps) {
  return (
    <a className={`text-link ${className}`.trim()} {...props}>
      {children}
    </a>
  );
}

export function ExternalLink({ className = "", children, ...props }: LinkProps) {
  return (
    <a className={`text-link external-link ${className}`.trim()} target="_blank" rel="noreferrer" {...props}>
      {children}
      <span aria-hidden="true"> ↗</span>
      <span className="visually-hidden"> (opens in a new tab)</span>
    </a>
  );
}

export function DownloadLink({
  className = "",
  children,
  format,
  size,
  year,
  ...props
}: LinkProps & { format: string; size: string; year: string }) {
  const content = (
    <>
      <span>{children}</span>
      <span className="download-link__meta">
        {format} · {size} · {year}
      </span>
    </>
  );

  if (!props.href) {
    return <span className={`download-link download-link--unavailable ${className}`.trim()} aria-disabled="true">{content}</span>;
  }

  return (
    <a className={`download-link ${className}`.trim()} {...props}>
      <span className="visually-hidden">Download </span>
      {content}
    </a>
  );
}

export function List({
  ordered = false,
  className = "",
  children,
}: {
  ordered?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const Tag = ordered ? "ol" : "ul";
  return <Tag className={`content-list ${className}`.trim()}>{children}</Tag>;
}

export function Quote({
  children,
  cite,
  className = "",
}: {
  children: ReactNode;
  cite?: string;
  className?: string;
}) {
  return (
    <figure className={`quote ${className}`.trim()}>
      <blockquote>{children}</blockquote>
      {cite ? <figcaption>— {cite}</figcaption> : null}
    </figure>
  );
}
