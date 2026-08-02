"use client";

export function PrintButton() {
  return (
    <button className="button button--secondary print-action" type="button" onClick={() => window.print()}>
      Print this page
    </button>
  );
}
