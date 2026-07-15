import { CsvRow } from "../types";

/**
 * Automatycznie wykrywa separator w tekście CSV (przecinek, średnik lub tabulator).
 */
export function detectDelimiter(csvText: string): string {
  const firstLine = csvText.split(/\r?\n/)[0] || "";
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  if (semicolonCount > commaCount && semicolonCount > tabCount) {
    return ";";
  }
  if (tabCount > commaCount && tabCount > semicolonCount) {
    return "\t";
  }
  return ",";
}

/**
 * Parsuje linijkę CSV uwzględniając cudzysłowy (standard RFC 4180).
 */
export function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote: "" -> "
        currentField += '"';
        i++; // pomin następny cudzysłów
      } else {
        // Przełącz stan cudzysłowu
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(currentField);
      currentField = "";
    } else {
      currentField += char;
    }
  }
  result.push(currentField);
  return result;
}

/**
 * Parsuje pełny tekst CSV do obiektów CsvRow.
 */
export function parseCsv(csvText: string, delimiter: string = "auto"): { headers: string[]; rows: any[] } {
  // Clear UTF-8 BOM if present
  let cleanText = csvText.replace(/^\uFEFF/, "");
  
  const finalDelimiter = delimiter === "auto" ? detectDelimiter(cleanText) : delimiter;
  
  const lines: string[][] = [];
  let currentFields: string[] = [];
  let currentField = "";
  let inQuotes = false;
  
  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    
    if (char === '"') {
      if (inQuotes && cleanText[i + 1] === '"') {
        currentField += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === finalDelimiter && !inQuotes) {
      currentFields.push(currentField);
      currentField = "";
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      currentFields.push(currentField);
      currentField = "";
      
      if (char === '\r' && cleanText[i + 1] === '\n') {
        i++; // skip \n
      }
      
      if (currentFields.length > 1 || (currentFields.length === 1 && currentFields[0].trim() !== "")) {
        lines.push(currentFields);
      }
      currentFields = [];
    } else {
      currentField += char;
    }
  }
  
  // Push the last record if there's any pending
  if (currentField !== "" || currentFields.length > 0) {
    currentFields.push(currentField);
    if (currentFields.length > 1 || (currentFields.length === 1 && currentFields[0].trim() !== "")) {
      lines.push(currentFields);
    }
  }

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  // Parse headers and clean them
  const rawHeaders = lines[0];
  const headers = rawHeaders.map(h => {
    let clean = h.trim();
    // Strip leading and trailing quotes if they surround the header
    if (clean.startsWith('"') && clean.endsWith('"')) {
      clean = clean.slice(1, -1);
    }
    return clean.trim();
  });

  // Deduplicate and fix empty headers
  const headerCounts = new Map<string, number>();
  const uniqueHeaders = headers.map((h, i) => {
    const key = h === "" ? `Kolumna ${i + 1}` : h;
    let count = headerCounts.get(key) || 0;
    count++;
    headerCounts.set(key, count);
    return count > 1 ? `${key} (${count})` : key;
  });

  const rows = lines.slice(1).map((fields) => {
    const rowValues: Record<string, string> = {};
    uniqueHeaders.forEach((header, index) => {
      let val = fields[index] !== undefined ? fields[index] : "";
      let cleanVal = val.trim();
      if (cleanVal.startsWith('"') && cleanVal.endsWith('"')) {
        cleanVal = cleanVal.slice(1, -1);
      }
      rowValues[header] = cleanVal;
    });
    return rowValues;
  });

  // Filter out completely empty rows
  const non_empty_rows = rows.filter(r => Object.values(r).some(v => v.trim() !== ""));

  return { headers: uniqueHeaders, rows: non_empty_rows };
}

/**
 * Przygotowuje dane do zapisu w formacie CSV.
 * Bezpiecznie ucieka cudzysłowy i specjalne znaki.
 */
export function escapeCsvField(field: string): string {
  if (field === undefined || field === null) return '""';
  const stringified = String(field);
  if (stringified.includes('"') || stringified.includes(",") || stringified.includes(";") || stringified.includes("\n") || stringified.includes("\r") || stringified.includes("\t")) {
    return `"${stringified.replace(/"/g, '""')}"`;
  }
  return stringified;
}

/**
 * Generuje tekst CSV z listy wierszy.
 */
export function stringifyCsv(
  headers: string[],
  rows: CsvRow[],
  delimiter: string,
  mode: 'overwrite' | 'add_columns',
  translationCols: string[]
): string {
  let exportHeaders = [...headers];
  
  if (mode === 'add_columns') {
    translationCols.forEach(col => {
      exportHeaders.push(`Poprawione_${col}`);
    });
  }

  const csvRows = [exportHeaders.map(escapeCsvField).join(delimiter)];

  rows.forEach((row) => {
    const values: string[] = [];
    
    headers.forEach((header) => {
      if (translationCols.includes(header) && mode === 'overwrite') {
        // Overwrite with corrected translation if available
        const corrected = row.correctedValues?.[header];
        values.push(corrected !== undefined ? corrected : (row.originalValues[header] || ""));
      } else {
        values.push(row.originalValues[header] || "");
      }
    });

    if (mode === 'add_columns') {
      translationCols.forEach(col => {
        values.push(row.correctedValues?.[col] !== undefined ? row.correctedValues[col]! : "");
      });
    }

    csvRows.push(values.map(escapeCsvField).join(delimiter));
  });

  return csvRows.join("\r\n");
}
