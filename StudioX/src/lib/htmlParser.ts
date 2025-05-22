// utils/htmlParser.ts

export function extractNumber(text: string): number {
  const num = parseFloat(text.replace(/[, ]/g, ""));
  return isNaN(num) ? 0 : num;
}

export function extractSectionTable(html: string, title: string): string {
  const regex = new RegExp(
    `<b>${title}</b>[\\s\\S]*?<table[^>]*>([\\s\\S]*?)<\\/table>`,
    "i"
  );
  const match = html.match(regex);
  return match?.[1] ?? "";
}

export function extractRows(tableHtml: string): RegExpMatchArray[] {
  return Array.from(tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g));
}

export function extractCells(rowHtml: string): string[] {
  return Array.from(rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)).map((m) =>
    m[1].trim().replace(/&nbsp;|<[^>]+>/g, "")
  );
}
