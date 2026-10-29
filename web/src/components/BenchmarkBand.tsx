import { nipunBand, type FslLevel } from "../lib/nipun";
import type { Lang } from "../theme/script";
import { TrendingUpIcon } from "./icons";

const LEVEL: Record<FslLevel, string> = {
  below: "Below the end-of-Grade-3 goal",
  partially: "Part way to the end-of-Grade-3 goal",
  meets: "Meets the end-of-Grade-3 goal",
  exceeds: "Exceeds the end-of-Grade-3 goal",
};

/**
 * One child's reading speed shown against the end-of-Grade-3 goal for their
 * language. Teacher-facing, so the words are English, and it says where the
 * child is rather than a pass or fail. Renders nothing when there is no reading,
 * or no band for the grade.
 */
export function BenchmarkBand({ lang, grade, wcpm }: {
  lang: Lang;
  grade: number;
  wcpm: number | null;
}) {
  if (wcpm == null) return null;
  const band = nipunBand(lang, grade, wcpm);
  if (!band) return null;

  return (
    <span className="benchmarkband">
      <TrendingUpIcon width={14} height={14} />
      <span className="benchmarkband__value">{wcpm} wpm</span>
      <span className="benchmarkband__label">
        {LEVEL[band.level]} ({band.goal.low}–{band.goal.high})
      </span>
    </span>
  );
}
