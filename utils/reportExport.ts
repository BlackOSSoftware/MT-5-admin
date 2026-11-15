/**
 * Shared report export helpers (CSV download + PDF download).
 * PDF is generated client-side with jsPDF + autotable.
 */

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export type ReportColumn = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
};

export type ReportRow = Record<string, string | number | null | undefined>;

export type PdfReportOptions = {
  title: string;
  subtitle?: string;
  filename?: string;
  generatedAt?: Date;
  filterSummary?: Array<{ label: string; value: string }>;
  summaryCards?: Array<{ label: string; value: string }>;
  columns: ReportColumn[];
  rows: ReportRow[];
};

const escapeCsvCell = (value: unknown): string => {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export function downloadCsv(
  filename: string,
  columns: ReportColumn[],
  rows: ReportRow[],
) {
  const header = columns.map((c) => escapeCsvCell(c.label)).join(",");
  const body = rows
    .map((row) => columns.map((c) => escapeCsvCell(row[c.key])).join(","))
    .join("\r\n");
  const csv = `\uFEFF${header}\r\n${body}\r\n`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const BRAND: [number, number, number] = [0, 66, 252]; // #0042FC
const INK: [number, number, number] = [26, 26, 46];
const MUTED: [number, number, number] = [100, 116, 139];

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "report";

export function downloadPdfReport(options: PdfReportOptions) {
  const {
    title,
    subtitle,
    filename,
    generatedAt = new Date(),
    filterSummary = [],
    summaryCards = [],
    columns,
    rows,
  } = options;

  const landscape = columns.length > 7;
  const doc = new jsPDF({
    orientation: landscape ? "landscape" : "portrait",
    unit: "pt",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 36;
  let y = margin;

  // ---- Header ----
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, pageWidth, 4, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...BRAND);
  doc.text(title, margin, y + 12);

  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(subtitle, margin, y + 26);
  }

  const generated = generatedAt.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text(`Generated: ${generated}`, pageWidth - margin, y + 12, {
    align: "right",
  });
  doc.text(`Total Records: ${rows.length}`, pageWidth - margin, y + 24, {
    align: "right",
  });

  y += 40;

  // ---- Filter chips ----
  if (filterSummary.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("FILTERS APPLIED", margin, y);
    y += 12;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...INK);
    const filterText = filterSummary
      .map((f) => `${f.label}: ${f.value}`)
      .join("   |   ");
    const wrapped = doc.splitTextToSize(filterText, pageWidth - margin * 2);
    doc.text(wrapped, margin, y);
    y += wrapped.length * 11 + 10;
  }

  // ---- Summary cards ----
  if (summaryCards.length > 0) {
    const cardWidth =
      (pageWidth - margin * 2 - (summaryCards.length - 1) * 8) /
      summaryCards.length;
    summaryCards.forEach((card, i) => {
      const x = margin + i * (cardWidth + 8);
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(x, y, cardWidth, 34, 4, 4, "FD");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...MUTED);
      doc.text(card.label.toUpperCase(), x + 8, y + 13);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...INK);
      doc.text(String(card.value), x + 8, y + 27);
    });
    y += 48;
  }

  // ---- Table ----
  const head = [columns.map((c) => c.label)];
  const body = rows.map((row) =>
    columns.map((c) => {
      const v = row[c.key];
      return v === null || v === undefined || v === "" ? "--" : String(v);
    }),
  );

  autoTable(doc, {
    startY: y,
    head,
    body,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 7.5,
      cellPadding: 4,
      textColor: INK,
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
      valign: "middle",
    },
    headStyles: {
      fillColor: BRAND,
      textColor: 255,
      fontStyle: "bold",
      fontSize: 7.5,
      halign: "left",
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: Object.fromEntries(
      columns.map((c, i) => [i, { halign: c.align || "left" }]),
    ),
    margin: { left: margin, right: margin, top: margin, bottom: 48 },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...MUTED);
      doc.text(
        `${title} — detailed report`,
        margin,
        doc.internal.pageSize.getHeight() - 24,
      );
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        pageWidth - margin,
        doc.internal.pageSize.getHeight() - 24,
        { align: "right" },
      );
    },
  });

  const stamp = generatedAt.toISOString().slice(0, 10);
  doc.save(filename || `${slugify(title)}-${stamp}.pdf`);
}
