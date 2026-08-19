import type { PublicDocumentRecordId } from "./public-document-publication.ts";

export const PUBLIC_DOCUMENT_ACTIVATION_BATCH_ID = "sskem-appendix-ix-document-activation-batch";
export const PUBLIC_DOCUMENT_ACTIVATION_BATCH_CONFIRMATION = "confirm-complete-appendix-ix-public-metadata";

export const publicDocumentActivationBatchRecordIds = [
  "document-mpd-b-1",
  "document-mpd-b-2",
  "document-mpd-b-3",
  "document-mpd-b-4",
  "document-mpd-b-5",
  "document-mpd-b-6",
  "document-mpd-b-7",
  "document-mpd-b-8",
  "document-mpd-c-1",
  "document-mpd-c-2",
  "document-mpd-c-3",
  "document-mpd-c-4",
] as const satisfies readonly PublicDocumentRecordId[];
