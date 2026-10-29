import type { ButtonIcon } from "../../components";
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
  primary: { label: CopyKey; to: string; icon?: ButtonIcon };
  secondary?: { label: CopyKey; to: string; icon?: ButtonIcon };
};

type Kind = "microphone" | "loading" | "connection" | "offline" | "speech" | "service";

function variant(
  key: Kind,
  parts: { steps?: boolean; note?: boolean },
  primary: { to: string; icon?: ButtonIcon },
  secondary?: { to: string; icon?: ButtonIcon },
): RecoveryVariant {
  const k = (s: string) => `recovery.${key}.${s}` as CopyKey;
  return {
    key,
    title: k("title"),
    subtitle: k("subtitle"),
    steps: parts.steps ? [k("step1"), k("step2"), k("step3")] : undefined,
    note: parts.note ? k("note") : undefined,
    primary: { label: k("primary"), to: primary.to, icon: primary.icon },
    secondary: secondary
      ? { label: k("secondary"), to: secondary.to, icon: secondary.icon }
      : undefined,
  };
}

/** "/read" means "this story again"; the screen adds the passage id. */
export const RECOVERY: Record<Kind, RecoveryVariant> = {
  microphone: variant(
    "microphone",
    { steps: true },
    { to: "/read", icon: "mic" },
    { to: "/reader", icon: "person" },
  ),
  loading: variant("loading", { note: true }, { to: "/reader", icon: "wait" }),
  connection: variant("connection", { note: true }, { to: "/", icon: "teacher" }),
  offline: variant(
    "offline",
    { steps: true },
    { to: "/checking", icon: "send" },
    { to: "/read", icon: "repeat" },
  ),
  speech: variant(
    "speech",
    { steps: true },
    { to: "/checking", icon: "retry" },
    { to: "/reader", icon: "person" },
  ),
  service: variant(
    "service",
    { steps: true },
    { to: "/checking", icon: "retry" },
    { to: "/reader", icon: "person" },
  ),
};

export function recoveryVariant(kind: string | undefined): RecoveryVariant {
  return (kind && RECOVERY[kind as Kind]) || RECOVERY.service;
}
