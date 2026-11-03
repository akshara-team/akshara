import type { Reader } from "../../api/types";
import { ChildMark, pictureOf } from "../../components";
import { t } from "../../i18n";
import type { Lang } from "../../theme/script";

/**
 * "Who is reading?" as pictures. A child of six finds their own bird or boat in chalk on a
 * small slate long before they can read their name; the nickname underneath is for the
 * teacher.
 */
export function ReaderGrid({
  readers,
  lang,
  busyId,
  onPick,
}: {
  readers: Reader[];
  lang: Lang;
  busyId?: string | null;
  onPick: (r: Reader) => void;
}) {
  return (
    <ul className="reader-grid" aria-label={t(lang, "reader.title")}>
      {readers.map((r, i) => (
        <li key={r.id} style={{ "--i": i } as React.CSSProperties}>
          <button
            type="button"
            className="reader-tile"
            aria-label={r.alias}
            aria-busy={busyId === r.id}
            disabled={!!busyId}
            onClick={() => onPick(r)}
          >
            <ChildMark picture={pictureOf(r.id, r.picture)} size="lg" />
            <span className="reader-tile__name">{r.alias}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
