import {
  motionDistancePixels,
  motionDurationSeconds,
  motionEase,
  motionScale,
  motionStaggerSeconds,
} from "@/lib/motion-tokens.generated";

export {
  motionDistancePixels,
  motionDurationSeconds,
  motionEase,
  motionScale,
  motionStaggerSeconds,
};

export const motionMedia = {
  reduce: "(prefers-reduced-motion: reduce)",
  mobile: "(max-width: 47.999rem) and (prefers-reduced-motion: no-preference)",
  tablet: "(min-width: 48rem) and (max-width: 63.999rem) and (prefers-reduced-motion: no-preference)",
  desktop: "(min-width: 64rem) and (prefers-reduced-motion: no-preference)",
} as const;

export const motionScrollTrigger = {
  start: "top 82%",
  toggleActions: "play none none none",
  once: true,
} as const;

export const homeArrivalSignal = {
  event: "sskem:home-arrival-ready",
  datasetKey: "homeArrivalReady",
} as const;
