import { createHomepagePosterDeliveryDecisionDownload } from "../lib/homepage-poster-delivery-decision.ts";

if (process.argv.length > 2) throw new Error("Poster delivery decision request does not accept arguments.");

const download = createHomepagePosterDeliveryDecisionDownload();
process.stdout.write(download.body);
