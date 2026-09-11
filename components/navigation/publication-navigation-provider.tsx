"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  getPublicationNavigation,
  type PublicationNavigationSnapshot,
} from "@/app/data/navigation";

const PublicationNavigationContext = createContext<PublicationNavigationSnapshot | null>(null);

function millisecondsUntilNextUtcDay(now = new Date()) {
  const nextDay = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0,
    0,
    1,
  );
  return Math.max(1_000, nextDay - now.getTime());
}

export function PublicationNavigationProvider({
  children,
  initialValue,
}: {
  children: ReactNode;
  initialValue: PublicationNavigationSnapshot;
}) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    const now = new Date();
    const current = getPublicationNavigation(now);
    const timeout = window.setTimeout(() => {
      setValue(getPublicationNavigation(new Date()));
    }, current.asOfDate !== value.asOfDate ? 0 : millisecondsUntilNextUtcDay(now));

    return () => window.clearTimeout(timeout);
  }, [value.asOfDate]);

  return (
    <PublicationNavigationContext.Provider value={value}>
      {children}
    </PublicationNavigationContext.Provider>
  );
}

export function usePublicationNavigation() {
  const value = useContext(PublicationNavigationContext);
  if (!value) {
    throw new Error("Publication navigation must be rendered inside its provider.");
  }
  return value;
}
