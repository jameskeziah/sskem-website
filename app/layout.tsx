import type { Metadata, Viewport } from "next";
import tokens from "./design-tokens.json";
import "./tokens.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Phase 1 Design System | SSKEMS",
    template: "%s | SSKEMS",
  },
  description:
    "The Phase 1 design system, shared components and accessible global navigation for SSKEMS.",
  icons: {
    icon: "/sskem-logo.png",
    shortcut: "/sskem-logo.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
  themeColor: tokens.reference.color.brand["800"].$value.hex,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
