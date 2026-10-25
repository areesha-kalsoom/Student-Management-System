export function jsonError(message: string, status = 400, details?: unknown) {
  return Response.json({ ok: false, error: message, ...(details === undefined ? {} : { details }) }, { status });
}

export function jsonOk<T extends Record<string, unknown>>(data: T, status = 200) {
  return Response.json({ ok: true, ...data }, { status });
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new Error("Request body must be valid JSON.");
  }
}

function postgresUniqueViolation(error: unknown) {
  let current: unknown = error;
  const visited = new Set<unknown>();
  for (let depth = 0; depth < 5 && typeof current === "object" && current !== null && !visited.has(current); depth += 1) {
    visited.add(current);
    const record = current as { code?: unknown; constraint?: unknown; cause?: unknown };
    if (record.code === "23505") return record;
    current = record.cause;
  }
  return null;
}

export function isDuplicateKeyError(error: unknown) {
  return postgresUniqueViolation(error) !== null;
}

export function uniqueConstraintName(error: unknown) {
  const violation = postgresUniqueViolation(error);
  return typeof violation?.constraint === "string" ? violation.constraint : "";
}

export function safeServerError(error: unknown) {
  if (process.env.NODE_ENV !== "production" && error instanceof Error) {
    console.error("Student management API error:", error.message);
  }
  return jsonError("Something went wrong. Please try again.", 500);
}

export function ensureSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const requestOrigin = new URL(request.url).origin;
    return new URL(origin).origin === requestOrigin;
  } catch {
    return false;
  }
}

export function escapeCsvCell(value: unknown) {
  let text = value == null ? "" : String(value);
  if (/^[\s]*[=+@\-\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
