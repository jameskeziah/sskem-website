import { homepagePosterDeliveryDecisionBindingSummary } from "../lib/homepage-poster-delivery-decision-binding.ts";

if (process.argv.length > 2) throw new Error("Poster delivery decision binding audit does not accept arguments.");

const summary = homepagePosterDeliveryDecisionBindingSummary();
if (summary.issues.length) {
  process.stderr.write(`Poster delivery decision binding audit failed:\n- ${summary.issues.join("\n- ")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`Poster delivery decision bindings: ${summary.valid} of ${summary.required} exact scope binding(s) recorded.\n`);
}
