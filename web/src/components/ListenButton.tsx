import { useState } from "react";
import { play } from "../audio/playback";
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
}: {
  text: string;
  lang: Lang;
  label?: string;
  block?: boolean;
}) {
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        icon="audio"
        block={block}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const source = await play(text, lang);
          setBusy(false);
          setNote(source === "none" ? "No audio available in this browser." : null);
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
