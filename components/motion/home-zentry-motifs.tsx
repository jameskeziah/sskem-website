import type { ReactNode } from "react";

export type ZentryMotifKind =
  | "architecture"
  | "pathway"
  | "science"
  | "motion"
  | "digital"
  | "culture"
  | "sport";

/**
 * Independent, decorative line illustrations for the seven hero scenes.
 * These are intentionally SVG rather than part of the photographs: the
 * supplied school media remains the truthful photographic layer.
 */
export function ZentryMotif({ kind }: { kind: ZentryMotifKind }) {
  const drawings: Record<ZentryMotifKind, ReactNode> = {
    architecture: (
      <>
        <g className="zhero__motif-trace" strokeDasharray="3 5" opacity=".65">
          <path d="M9 35H160M9 72H147M37 8V159M98 8V153M143 17V147" />
          <path d="M25 118h128v38H25zM46 118V79h86v39M46 94h86" />
        </g>
        <g className="zhero__motif-spin">
          <circle cx="126" cy="43" r="17" />
          <circle cx="126" cy="43" r="7" />
          <path d="M126 16v10m0 34v10m-27-27h10m34 0h10m-46-19 7 7m24 24 7 7m0-38-7 7m-24 24-7 7" />
        </g>
        <path strokeWidth="3" d="M13 13h17m-17 0v17m145 131h-18m18 0v-18" />
      </>
    ),
    pathway: (
      <>
        <path className="zhero__motif-trace" strokeDasharray="4 8" d="M11 139C53 138 33 48 89 54S137 99 162 13" />
        <path strokeWidth="3" d="m148 22 14-10 2 17M23 125l9 12-13 9" />
        <g transform="translate(94 90) rotate(-12)">
          <rect width="70" height="54" rx="9" strokeDasharray="5 3" />
          <path d="M9 17h52M9 38h52M36 5v44" opacity=".5" />
          <path strokeWidth="3" d="m22 27 9 8 18-21" />
        </g>
        <path d="m28 29 15 0m-8-7 8 7-8 7" />
      </>
    ),
    science: (
      <>
        <g className="zhero__motif-orbit" transform="translate(122 48)">
          <ellipse rx="38" ry="15" />
          <ellipse rx="38" ry="15" transform="rotate(60)" />
          <ellipse rx="38" ry="15" transform="rotate(120)" />
          <circle r="5" fill="currentColor" stroke="none" />
        </g>
        <path strokeWidth="3" d="M31 14h46m-7 0v48l28 73c5 11 0 18-12 18H22c-12 0-17-7-12-18l28-73V14" />
        <path d="M23 117q15-11 32-2t31-2M39 37h31M13 137h82" />
        <g strokeDasharray="2 7" opacity=".8">
          <path d="M116 114h54m-54 13h44m-44 13h54" />
        </g>
        <circle cx="46" cy="105" r="3" /><circle cx="65" cy="90" r="4" />
      </>
    ),
    motion: (
      <>
        <g className="zhero__motif-speed">
          <path strokeWidth="3" strokeLinecap="round" d="M12 36h64M23 51h40M9 66h54M133 25h28M144 42h22" />
          <path d="M20 83q50-26 115-10l25 33-20 16H58L28 104z" />
          <path strokeWidth="3" d="M53 120h85M65 83v15h57" />
          <circle cx="65" cy="132" r="17" /><circle cx="126" cy="132" r="17" />
          <circle cx="65" cy="132" r="5" /><circle cx="126" cy="132" r="5" />
          <path d="m105 23 14-10m-14 10 15 2" />
        </g>
      </>
    ),
    digital: (
      <>
        <g className="zhero__motif-trace" strokeDasharray="3 5" opacity=".7">
          <path d="M6 31h55l19 20h43M10 122h55l18-19h44M147 13v26m0 84v34" />
          <circle cx="6" cy="31" r="3" /><circle cx="10" cy="122" r="3" />
          <circle cx="147" cy="13" r="3" />
        </g>
        <rect x="70" y="35" width="72" height="69" rx="15" strokeWidth="3" />
        <path d="M106 35V23m-13 0h26M70 66H57m85 0h13" />
        <circle cx="89" cy="64" r="4" fill="currentColor" stroke="none" />
        <circle cx="121" cy="64" r="4" fill="currentColor" stroke="none" />
        <path d="M88 80q17 13 34 0" strokeWidth="3" strokeLinecap="round" />
        <path className="zhero__motif-cursor" strokeWidth="3" d="m29 83 5 56 12-16 13 21 10-7-13-20 21-3z" />
        <path d="M28 14v8m-4-4h8M152 135v8m-4-4h8" />
      </>
    ),
    culture: (
      <>
        <path className="zhero__motif-trace" d="M8 126q19-27 39-5t37-8 35-2 43-15" strokeDasharray="3 6" />
        <g transform="translate(24 14) rotate(-10 66 51)">
          <path strokeWidth="3" d="M13 13q32-13 57 4v47q-8 29-29 36Q17 92 13 62z" />
          <path strokeWidth="3" d="M70 17q29-12 57 1v44q-8 24-29 32Q79 87 70 64" />
          <path d="M22 48q11-11 20 0m7 0q9-11 17 0m-38 17q13 17 28 0M79 50q7-7 14 0m14 0q7-7 14 0m-40 22q18-14 34-1" />
        </g>
        <g className="zhero__motif-notes">
          <path strokeWidth="3" d="M135 17v35q-15-7-16 5t16 3V30l25-8v24q-15-7-16 5t16 3V17z" />
        </g>
        <path d="m12 29 4 9 10 3-10 3-4 9-4-9-10-3 10-3z" />
      </>
    ),
    sport: (
      <>
        <path className="zhero__motif-trace" d="M8 145h162M8 158h162M23 24h36m-18-10v21" strokeDasharray="6 5" />
        <circle cx="88" cy="25" r="11" strokeWidth="3" />
        <path strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"
          d="m80 48 33 21 16-11m-16 11-23 28-42 2m42-2 26 23 25 4M91 57 62 77 37 67" />
        <path strokeWidth="4" strokeLinecap="round" d="m34 68-13-10m117 65 16 15m-112-37-18 18" />
        <circle cx="151" cy="48" r="14" />
        <path d="m142 37 7 11-6 12m15-23-7 11 6 12M138 48h27" />
        <path d="M20 23h14m-7-7 7 7-7 7" />
      </>
    ),
  };

  return (
    <svg
      className={`zhero__motif zhero__motif--${kind}`}
      viewBox="0 0 180 180"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {drawings[kind]}
    </svg>
  );
}
