import jsPDF from 'jspdf';

export interface ExportSheet {
  title: string;
  columns: string[];
  rows: (string | number)[][];
}

function escapeCsv(v: string | number): string {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function escapeHtml(v: string | number): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCsv(sheets: ExportSheet[], filename: string): void {
  const lines: string[] = [];
  for (const sheet of sheets) {
    lines.push(sheet.title);
    lines.push(sheet.columns.map(escapeCsv).join(','));
    for (const row of sheet.rows) lines.push(row.map(escapeCsv).join(','));
    lines.push('');
  }
  // BOM so Excel opens UTF-8 correctly on Windows.
  download(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' }), `${filename}.csv`);
}

/**
 * Writes an HTML table with an .xls extension. Excel opens this natively and it
 * keeps one sheet per section, which avoids pulling in a spreadsheet library
 * for what is otherwise a tabular dump.
 */
export function exportExcel(sheets: ExportSheet[], filename: string): void {
  const tables = sheets.map(sheet => `
    <h3>${escapeHtml(sheet.title)}</h3>
    <table border="1">
      <thead><tr>${sheet.columns.map(c => `<th>${escapeHtml(c)}</th>`).join('')}</tr></thead>
      <tbody>
        ${sheet.rows.map(r => `<tr>${r.map(c => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('')}
      </tbody>
    </table>`).join('<br/>');

  const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel">
    <head><meta charset="utf-8" /></head><body>${tables}</body></html>`;

  download(new Blob(['﻿' + html], { type: 'application/vnd.ms-excel;charset=utf-8;' }), `${filename}.xls`);
}

export function exportPdf(sheets: ExportSheet[], filename: string, subtitle: string): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 40;
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = margin;

  const newPageIfNeeded = (needed: number) => {
    if (y + needed <= pageHeight - margin) return;
    doc.addPage();
    y = margin;
  };

  doc.setFontSize(16);
  doc.setTextColor(128, 0, 32); // Suhana maroon
  doc.text('AI Search Analytics', margin, y);
  y += 18;

  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(subtitle, margin, y);
  y += 22;

  for (const sheet of sheets) {
    newPageIfNeeded(60);

    doc.setFontSize(12);
    doc.setTextColor(128, 0, 32);
    doc.text(sheet.title, margin, y);
    y += 14;

    const colWidth = (pageWidth - margin * 2) / sheet.columns.length;

    doc.setFontSize(9);
    doc.setTextColor(90);
    sheet.columns.forEach((c, i) => doc.text(String(c), margin + i * colWidth, y));
    y += 4;
    doc.setDrawColor(220);
    doc.line(margin, y, pageWidth - margin, y);
    y += 12;

    doc.setTextColor(40);
    for (const row of sheet.rows) {
      newPageIfNeeded(16);
      row.forEach((cell, i) => {
        const text = doc.splitTextToSize(String(cell ?? ''), colWidth - 6)[0] ?? '';
        doc.text(text, margin + i * colWidth, y);
      });
      y += 14;
    }
    y += 14;
  }

  doc.save(`${filename}.pdf`);
}
