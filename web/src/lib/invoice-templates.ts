import type { HqOrgSettings } from "@/lib/hq-setup";

export type InvoiceTemplateId = HqOrgSettings["invoiceTemplate"];

export type InvoiceTemplateMeta = {
  id: InvoiceTemplateId;
  label: string;
  hint: string;
  swatch: string;
  paper: string;
};

/** Shared by the picker and the live preview so every name matches its look. */
export const INVOICE_TEMPLATES: InvoiceTemplateMeta[] = [
  {
    id: "modern",
    label: "Modern",
    hint: "Gradient header",
    swatch: "linear-gradient(135deg, #0F2C59, #5788D3)",
    paper: "#FFFFFF",
  },
  {
    id: "letterhead",
    label: "Letterhead",
    hint: "Formal masthead",
    swatch: "#FFFFFF",
    paper: "#FFFFFF",
  },
  {
    id: "classic",
    label: "Classic",
    hint: "Traditional double rule",
    swatch: "#F3F4F6",
    paper: "#FFFFFF",
  },
  {
    id: "sapphire",
    label: "Sapphire",
    hint: "Deep blue side rail",
    swatch: "#123A6B",
    paper: "#FFFFFF",
  },
  {
    id: "ivory",
    label: "Ivory",
    hint: "Warm cream & gold",
    swatch: "#FBF6EC",
    paper: "#FBF6EC",
  },
  {
    id: "minimal",
    label: "Minimal",
    hint: "Clean monochrome",
    swatch: "#FFFFFF",
    paper: "#FFFFFF",
  },
  {
    id: "coral",
    label: "Coral",
    hint: "Warm ribbon",
    swatch: "#F97362",
    paper: "#FFFFFF",
  },
  {
    id: "slate",
    label: "Slate",
    hint: "Charcoal bands",
    swatch: "#1F2937",
    paper: "#FFFFFF",
  },
];

export function invoiceTemplateMeta(id: InvoiceTemplateId): InvoiceTemplateMeta {
  return INVOICE_TEMPLATES.find((row) => row.id === id) ?? INVOICE_TEMPLATES[0];
}
