import type { Metadata, Viewport } from "next";
import tokens from "./design-tokens.json";
import "./tokens.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.sskemschool.com"),
  title: {
    default: "SSKEMS School Website",
    template: "%s | SSKEMS",
  },
  description:
    "The SSKEMS school website rebuild, including accessible admissions guidance, Mandatory Public Disclosure and a controlled document archive.",
  icons: {
    icon: "/sskem-logo.png",
    shortcut: "/sskem-logo.png",
  },
  robots: { index: false, follow: true },
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
