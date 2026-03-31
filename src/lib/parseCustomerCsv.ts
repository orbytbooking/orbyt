/**
 * Parse CSV text into rows with quoted-field support (RFC 4180 style).
 */
export function parseCsvMatrix(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;
  const s = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(cur);
      cur = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(cur);
      cur = "";
      if (row.some((cell) => String(cell).trim() !== "")) rows.push(row);
      row = [];
    } else {
      cur += c;
    }
  }
  row.push(cur);
  if (row.some((cell) => String(cell).trim() !== "")) rows.push(row);
  return rows;
}

export type ParsedCustomerRow = {
  name: string;
  email: string;
  phone: string;
  address: string;
};

const normHeader = (s: string) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

function findCol(headerRaw: string[], aliases: string[]): number {
  for (let i = 0; i < headerRaw.length; i++) {
    const h = normHeader(headerRaw[i] || "");
    for (const a of aliases) {
      if (h === a || h === a.replace(/ /g, "_")) return i;
    }
  }
  return -1;
}

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseCustomerCsv(text: string): {
  rows: ParsedCustomerRow[];
  headerErrors: string[];
  rowErrors: string[];
} {
  const matrix = parseCsvMatrix(text.trim());
  if (matrix.length < 1) {
    return {
      rows: [],
      headerErrors: ["File is empty."],
      rowErrors: [],
    };
  }
  const headerRaw = matrix[0];
  const iName = findCol(headerRaw, ["name", "full name", "customer name", "customer"]);
  const iEmail = findCol(headerRaw, ["email", "e-mail", "email address"]);
  const iPhone = findCol(headerRaw, ["phone", "mobile", "phone number", "tel"]);
  const iAddr = findCol(headerRaw, ["address", "street", "location"]);

  if (iName < 0 || iEmail < 0) {
    return {
      rows: [],
      headerErrors: [
        "Add a header row with at least Name and Email columns (same as Export).",
      ],
      rowErrors: [],
    };
  }

  const rows: ParsedCustomerRow[] = [];
  const rowErrors: string[] = [];

  for (let r = 1; r < matrix.length; r++) {
    const line = matrix[r];
    const name = String(line[iName] ?? "").trim();
    const email = String(line[iEmail] ?? "").trim();
    const phone = iPhone >= 0 ? String(line[iPhone] ?? "").trim() : "";
    const address = iAddr >= 0 ? String(line[iAddr] ?? "").trim() : "";

    if (!email && !name) continue;

    if (!name) {
      rowErrors.push(`Row ${r + 1}: name is required`);
      continue;
    }
    if (!email) {
      rowErrors.push(`Row ${r + 1}: email is required`);
      continue;
    }
    if (!EMAIL_OK.test(email)) {
      rowErrors.push(`Row ${r + 1}: invalid email "${email}"`);
      continue;
    }

    rows.push({ name, email, phone, address });
  }

  return { rows, headerErrors: [], rowErrors };
}
