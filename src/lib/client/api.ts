export async function apiRequest<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  let response: Response;
  try {
    response = await fetch(url, { ...options, headers, credentials: "same-origin" });
  } catch {
    throw new Error("Could not reach the server. Check your connection and try again.");
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    if (!response.ok) throw new Error(`Request failed (${response.status}).`);
    return (await response.text()) as T;
  }
  const data = await response.json();
  if (!response.ok || data.ok === false) throw new Error(data.error ?? `Request failed (${response.status}).`);
  return data as T;
}

export function fieldMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}
