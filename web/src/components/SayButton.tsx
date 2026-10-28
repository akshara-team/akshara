import { useState } from "react";
import { play } from "../audio/playback";
import { t, type CopyKey } from "../i18n";
import type { Lang } from "../theme/script";
import { VolumeIcon } from "./icons";

/**
 * Says a screen's instruction aloud, for a child who cannot read it yet. Timbre's voice from the
 * server's content cache (one paid call the first time a line is heard, none after), else the
 * device voice. Only on a tap: nothing plays by itself. Every spoken line is under Timbre's
 * 60-character limit in each language (checked in i18n.test.ts).
 */
export function SayButton({ k, lang }: { k: CopyKey; lang: Lang }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="say-button"
      aria-label={t(lang, "say.label")}
      title={t(lang, "say.label")}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await play(t(lang, k), lang);
        setBusy(false);
      }}
    >
      <VolumeIcon width={22} height={22} aria-hidden="true" />
    </button>
  );
}
