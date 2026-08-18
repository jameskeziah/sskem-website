"use client";

import { type FormEvent, useState } from "react";

import {
  createCampusMasterPreflightReport,
  type CampusMasterMeasurement,
  type CampusMasterPreflightPipeline,
} from "@/lib/campus-master-preflight";

type CampusMasterPreflightRecord = {
  recordId: string;
  title: string;
  notes: string;
};

type PreflightCompletion = ReturnType<typeof createCampusMasterPreflightReport>;

function detectFormat(file: File) {
  const mimeFormats: Record<string, string> = {
    "image/jpeg": "jpeg",
    "image/jpg": "jpeg",
    "image/png": "png",
    "image/tiff": "tiff",
    "image/x-tiff": "tiff",
  };
  if (mimeFormats[file.type.toLowerCase()]) return mimeFormats[file.type.toLowerCase()];
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "jpg" || extension === "jpeg") return "jpeg";
  if (extension === "png") return "png";
  if (extension === "tif" || extension === "tiff") return "tiff";
  return "unknown";
}

function hexadecimal(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function browserDimensions(file: File) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    const decoded = new Promise<{ width: number; height: number }>((resolve, reject) => {
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(new Error("The browser could not decode this image."));
    });
    image.src = objectUrl;
    return await decoded;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function measureFile(recordId: string, file: File): Promise<CampusMasterMeasurement> {
  const bytes = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  try {
    const dimensions = await browserDimensions(file);
    return {
      recordId,
      format: detectFormat(file),
      mimeType: file.type,
      bytes: file.size,
      width: dimensions.width,
      height: dimensions.height,
      sha256: hexadecimal(digest),
      browserDecoded: true,
    };
  } catch {
    return {
      recordId,
      format: detectFormat(file),
      mimeType: file.type,
      bytes: file.size,
      width: null,
      height: null,
      sha256: hexadecimal(digest),
      browserDecoded: false,
    };
  }
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

function downloadReport(completion: PreflightCompletion) {
  const objectUrl = URL.createObjectURL(new Blob([completion.body], { type: "application/json" }));
  const download = document.createElement("a");
  download.href = objectUrl;
  download.download = completion.filename;
  download.click();
  URL.revokeObjectURL(objectUrl);
}

export function CampusMasterPreflightForm({
  records,
  pipeline,
}: {
  records: CampusMasterPreflightRecord[];
  pipeline: CampusMasterPreflightPipeline;
}) {
  const [completion, setCompletion] = useState<PreflightCompletion | null>(null);
  const [message, setMessage] = useState("");
  const [processing, setProcessing] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProcessing(true);
    setCompletion(null);
    setMessage("Checking four local masters…");
    const form = new FormData(event.currentTarget);
    try {
      const measurements = await Promise.all(records.map(async (record) => {
        const selection = form.get(`master:${record.recordId}`);
        if (!(selection instanceof File) || selection.size === 0) {
          throw new Error(`Choose a non-empty file for ${record.title}.`);
        }
        return measureFile(record.recordId, selection);
      }));
      const nextCompletion = createCampusMasterPreflightReport({ measurements, pipeline });
      setCompletion(nextCompletion);
      setMessage(nextCompletion.report.status === "ready-for-authoritative-local-inspection"
        ? "All four files passed browser preflight. Download the report, then run authoritative local inspection for every master."
        : "Browser preflight found one or more blockers. Review the record results before controlled intake.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The campus master preflight could not be completed.");
    } finally {
      setProcessing(false);
    }
  }

  function invalidateResult() {
    setCompletion(null);
    setMessage("");
  }

  return (
    <form className="campus-preflight-form" onSubmit={handleSubmit} onChange={invalidateResult}>
      <div className="campus-preflight-records">
        {records.map((record, index) => {
          const result = completion?.report.records.find((candidate) => candidate.recordId === record.recordId);
          return (
            <section className="campus-preflight-record" aria-labelledby={`${record.recordId}-preflight-title`} key={record.recordId}>
              <div className="campus-preflight-record__heading">
                <span>Master {index + 1}</span>
                <h2 id={`${record.recordId}-preflight-title`}>{record.title}</h2>
                <code>{record.recordId}</code>
              </div>
              <p>{record.notes}</p>
              <label>
                <span>Select the controlled master</span>
                <input
                  accept=".jpg,.jpeg,.png,.tif,.tiff,image/jpeg,image/png,image/tiff"
                  name={`master:${record.recordId}`}
                  type="file"
                  required
                />
                <small>The website reads the file in this tab only. It does not upload, rename, crop or rewrite it.</small>
              </label>
              {result ? (
                <div className="campus-preflight-result" data-status={result.status}>
                  <strong>{result.status === "ready-for-authoritative-local-inspection" ? "Browser preflight passed" : "Blocked"}</strong>
                  <span>{result.width && result.height ? `${result.width} × ${result.height}` : "Dimensions unavailable"} · {formatBytes(result.bytes)} · {result.format.toUpperCase()}</span>
                  <code>SHA-256 {result.sha256 ?? "unavailable"}</code>
                  {result.issues.length ? <ul>{result.issues.map((issue) => <li key={issue.code}>{issue.message}</li>)}</ul> : null}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>

      <section className="campus-preflight-submit" aria-labelledby="campus-preflight-submit-title">
        <div>
          <p className="eyebrow">Technical report</p>
          <h2 id="campus-preflight-submit-title">Check exact bytes without storing the masters.</h2>
          <p>The report may document a blocked result; it never represents colour-space verification, metadata inspection, approval or publication.</p>
        </div>
        <div className="campus-preflight-submit__actions">
          <button className="button button--primary" type="submit" disabled={processing}>
            {processing ? "Checking local files…" : "Run browser preflight"}
          </button>
          {completion ? (
            <button className="button button--quiet" type="button" onClick={() => downloadReport(completion)}>
              Download preflight report
            </button>
          ) : null}
        </div>
        <p className="campus-preflight-message" aria-live="polite">{message}</p>
      </section>
    </form>
  );
}
