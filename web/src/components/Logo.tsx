import { scriptClass, type Lang } from "../theme/script";

/** The first akshara of each script: the mark follows the class's language. */
export const FIRST_AKSHARA: Record<Lang, string> = { "kn-IN": "ಅ", "ta-IN": "அ", "hi-IN": "अ" };

const DOTS = 8;
const RING = 19; // the dot ring's radius, in a 48-unit box
const WEAVE = 4.5; // how far the line swings outside and inside the dots

/** One closed kolam line weaving outside and inside a ring of eight dots. */
function ringPath(): string {
  const pts: string[] = [];
  const steps = 160;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    // Outside one dot, inside the next: the sign flips every 360/DOTS degrees.
    const r = RING + WEAVE * Math.cos((DOTS / 2) * a);
    pts.push(`${(24 + r * Math.cos(a)).toFixed(2)} ${(24 + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join(" L")}Z`;
}

const PATH = ringPath();

/**
 * Akshara's mark: the script's first akshara at the door of a kolam, one line weaving round
 * a ring of dots, beside the wordmark.
 */
export function Logo({ lang, wordmark = true, size = 40 }: { lang: Lang; wordmark?: boolean; size?: number }) {
  return (
    <span className="logo" role="img" aria-label="Akshara">
      <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true" focusable="false">
        {Array.from({ length: DOTS }, (_, k) => {
          const a = (k / DOTS) * Math.PI * 2;
          return <circle key={k} className="logo__dot" cx={24 + RING * Math.cos(a)} cy={24 + RING * Math.sin(a)} r={1.5} />;
        })}
        <path className="logo__line" d={PATH} />
        <text className={`logo__akshara ${scriptClass(lang)}`} x="24" y="24" lang={lang}>
          {FIRST_AKSHARA[lang]}
        </text>
      </svg>
      {wordmark && <span className="logo__word" aria-hidden="true">Akshara</span>}
    </span>
  );
}
