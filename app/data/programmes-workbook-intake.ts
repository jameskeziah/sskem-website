import receiptData from "@/content/programmes-workbook-intake-receipt.json";
import {
  validateProgrammesWorkbookIntakeReceipt,
  type ProgrammesWorkbookIntakeReceipt,
} from "@/lib/programmes-workbook-intake";

export const programmesWorkbookIntakeReceipt = receiptData as unknown as ProgrammesWorkbookIntakeReceipt;

const receiptIssues = validateProgrammesWorkbookIntakeReceipt(programmesWorkbookIntakeReceipt);
if (receiptIssues.length) throw new Error(`Programmes workbook intake receipt is invalid: ${receiptIssues[0]}`);
