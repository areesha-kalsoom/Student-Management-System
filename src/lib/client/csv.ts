export function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') { cell += '"'; index += 1; }
      else if (character === '"') quoted = false;
      else cell += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") { row.push(cell); cell = ""; }
    else if (character === "\n") { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
    else cell += character;
  }
  if (quoted) throw new Error("The CSV has an unclosed quoted value.");
  if (cell.length || row.length) { row.push(cell.replace(/\r$/, "")); rows.push(row); }
  const useful = rows.filter((values) => values.some((value) => value.trim() !== ""));
  if (useful.length < 2) throw new Error("Choose a CSV file with a header row and at least one student.");
  const headers = useful[0].map((header) => header.trim());
  if (headers.some((header) => !header)) throw new Error("Every CSV column needs a heading.");
  if (new Set(headers.map((header) => header.toLowerCase())).size !== headers.length) throw new Error("CSV headings must be unique.");
  return { headers, rows: useful.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]))) };
}
