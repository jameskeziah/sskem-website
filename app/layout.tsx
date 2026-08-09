import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import tokens from "./design-tokens.json";
import "./tokens.css";
import "./globals.css";

const canonicalOrigin = new URL("https://www.sskemschool.com");

function safeRequestOrigin(hostValue: string | null, protocolValue: string | null) {
  const host = hostValue?.split(",")[0]?.trim();
  if (!host || !/^[a-z0-9.-]+(?::\d+)?$/i.test(host)) return canonicalOrigin;

  const requestedProtocol = protocolValue?.split(",")[0]?.trim().toLowerCase();
  const protocol = requestedProtocol === "http" || requestedProtocol === "https"
    ? requestedProtocol
    : host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https";

  try {
    return new URL(`${protocol}://${host}`);
  } catch {
    return canonicalOrigin;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const metadataBase = safeRequestOrigin(
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"),
    requestHeaders.get("x-forwarded-proto"),
  );
  const socialImage = new URL("/og.png", metadataBase).toString();

  return {
    metadataBase,
    title: {
      default: "SSKEMS School Website",
      template: "%s | SSKEMS",
    },
    description:
      "Explore SSKEMS in Veral, including admissions guidance, campus life, Mandatory Public Disclosure and the controlled document archive.",
    icons: {
      icon: "/sskem-logo.png",
      shortcut: "/sskem-logo.png",
    },
    openGraph: {
      type: "website",
      siteName: "SSKEMS",
      title: "Here, possibility begins. | SSKEMS",
      description: "Shree Samarth Krupa English Medium School in Veral.",
      images: [{ url: socialImage, width: 1200, height: 630, alt: "Here, possibility begins at SSKEMS in Veral." }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Here, possibility begins. | SSKEMS",
      description: "Shree Samarth Krupa English Medium School in Veral.",
      images: [socialImage],
    },
    robots: { index: false, follow: true },
  };
}

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
