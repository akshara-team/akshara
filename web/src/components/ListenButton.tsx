import { useState } from "react";
import { play } from "../audio/playback";
import { t } from "../i18n";
import type { Lang } from "../theme/script";
import { Button } from "./Button";

/**
 * "Listen" for a word or passage. Plays model audio when the backend has it,
 * otherwise the device voice; says so when neither is available.
 */
export function ListenButton({
  text,
  lang,
  label = "Listen",
  block = false,
  uiLang,
}: {
  text: string;
  lang: Lang;
  label?: string;
  block?: boolean;
  /** Language of the screen; teacher screens leave it out (English). */
  uiLang?: Lang;
}) {
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        icon="audio"
        size="sm"
        block={block}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const source = await play(text, lang);
          setBusy(false);
          const none = uiLang ? t(uiLang, "common.noAudio") : "No audio available in this browser.";
          setNote(source === "none" ? none : null);
        }}
      >
        {label}
      </Button>
      {note && (
        <span className="note" role="status">
          {note}
        </span>
      )}
    </>
  );
}
