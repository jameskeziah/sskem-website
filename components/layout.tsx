import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

type BoxProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function PageContainer({ className = "", ...props }: BoxProps) {
  return <div className={`page-container ${className}`.trim()} {...props} />;
}

export function ReadingContainer({ className = "", ...props }: BoxProps) {
  return <div className={`reading-container ${className}`.trim()} {...props} />;
}

type SectionProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  tone?: "page" | "subtle" | "raised" | "brand";
};

export function Section({ className = "", tone = "page", ...props }: SectionProps) {
  return <section className={`section section--${tone} ${className}`.trim()} {...props} />;
}

type FlowProps = BoxProps & {
  gap?: "4" | "8" | "12" | "16" | "24" | "32" | "48" | "64";
};

export function Stack({ className = "", gap = "24", style, ...props }: FlowProps) {
  return (
    <div
      className={`stack ${className}`.trim()}
      style={{ "--flow-gap": `var(--space-${gap})`, ...style } as CSSProperties}
      {...props}
    />
  );
}

export function Inline({ className = "", gap = "12", style, ...props }: FlowProps) {
  return (
    <div
      className={`inline ${className}`.trim()}
      style={{ "--flow-gap": `var(--space-${gap})`, ...style } as CSSProperties}
      {...props}
    />
  );
}

type GridProps = FlowProps & {
  min?: "compact" | "card" | "wide";
};

export function Grid({ className = "", gap = "24", min = "card", style, ...props }: GridProps) {
  return (
    <div
      className={`grid grid--${min} ${className}`.trim()}
      style={{ "--flow-gap": `var(--space-${gap})`, ...style } as CSSProperties}
      {...props}
    />
  );
}

export function Cluster({ className = "", gap = "12", style, ...props }: FlowProps) {
  return (
    <div
      className={`cluster ${className}`.trim()}
      style={{ "--flow-gap": `var(--space-${gap})`, ...style } as CSSProperties}
      {...props}
    />
  );
}

export function Divider({ className = "", ...props }: HTMLAttributes<HTMLHRElement>) {
  return <hr className={`divider ${className}`.trim()} {...props} />;
}

type AspectRatioProps = BoxProps & {
  ratio?: "square" | "portrait" | "landscape" | "cinema";
};

export function AspectRatio({ className = "", ratio = "landscape", ...props }: AspectRatioProps) {
  return <div className={`aspect-ratio aspect-ratio--${ratio} ${className}`.trim()} {...props} />;
}

export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <span className="visually-hidden">{children}</span>;
}
