import type { CopyKey } from "../../i18n";

/**
 * Recovery screens (Figma section 04). The text lives in `src/i18n/*.json` under
 * `recovery.<key>.*`, so it follows the child's language; this file says what each screen has
 * and where its buttons go.
 */
export type RecoveryVariant = {
  key: string;
  title: CopyKey;
  subtitle?: CopyKey;
  steps?: CopyKey[];
  /** Shown in place of steps when the screen is just a waiting state. */
  note?: CopyKey;
  primary: { label: CopyKey; to: string };
  secondary?: { label: CopyKey; to: string };
};

type Kind = "microphone" | "loading" | "connection" | "offline" | "speech" | "service";

function variant(
  key: Kind,
  parts: { steps?: boolean; note?: boolean },
  primary: string,
  secondary?: string,
): RecoveryVariant {
  const k = (s: string) => `recovery.${key}.${s}` as CopyKey;
  return {
    key,
    title: k("title"),
    subtitle: k("subtitle"),
    steps: parts.steps ? [k("step1"), k("step2"), k("step3")] : undefined,
    note: parts.note ? k("note") : undefined,
    primary: { label: k("primary"), to: primary },
    secondary: secondary ? { label: k("secondary"), to: secondary } : undefined,
  };
}

/** "/read" means "this story again"; the screen adds the passage id. */
export const RECOVERY: Record<Kind, RecoveryVariant> = {
  microphone: variant("microphone", { steps: true }, "/read", "/reader"),
  loading: variant("loading", { note: true }, "/reader"),
  connection: variant("connection", { note: true }, "/"),
  offline: variant("offline", { steps: true }, "/checking", "/read"),
  speech: variant("speech", { steps: true }, "/checking", "/reader"),
  service: variant("service", { steps: true }, "/checking", "/reader"),
};

export function recoveryVariant(kind: string | undefined): RecoveryVariant {
  return (kind && RECOVERY[kind as Kind]) || RECOVERY.service;
}
