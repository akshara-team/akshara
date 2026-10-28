/**
 * A random id for a recording or a story run. `crypto.randomUUID` exists only on HTTPS and
 * localhost, and a classroom tablet may reach the server over plain HTTP on the school
 * network, so this falls back to `getRandomValues`, which works everywhere.
 */
export function newId(): string {
  const c = typeof crypto !== "undefined" ? crypto : undefined;
  if (c?.randomUUID) return c.randomUUID();
  const bytes = new Uint8Array(16);
  if (c?.getRandomValues) c.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}
