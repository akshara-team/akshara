import { bestStreak, currentStreak, starCount } from "../state/rewards";
import type { StoredReading } from "../state/storage";
import { FlameIcon, StarIcon, TrendingUpIcon } from "./icons";

/**
 * A child's stars and reading streak, large and friendly. No leaderboard and no
 * comparison with other children.
 *
 * Everything it shows is derived from the child's own saved history, so it stays
 * in step across reloads. The labels default to English and are meant to be
 * handed the child's language when this is wired into the child home.
 */
export function RewardsStrip({ readings, now, labels, className }: {
  readings: StoredReading[];
  now?: Date;
  labels?: { stars?: string; streak?: string; best?: string };
  className?: string;
}) {
  const stars = starCount(readings);
  const streak = currentStreak(readings, now);
  const best = bestStreak(readings);

  return (
    <ul className={["rewardsstrip", className].filter(Boolean).join(" ")}>
      <li className="rewardsstrip__item">
        <StarIcon width={20} height={20} />
        <span className="rewardsstrip__count">{stars}</span>
        <span className="rewardsstrip__label">{labels?.stars ?? "Stars"}</span>
      </li>
      <li className="rewardsstrip__item">
        <FlameIcon width={20} height={20} />
        <span className="rewardsstrip__count">{streak}</span>
        <span className="rewardsstrip__label">{labels?.streak ?? "Day streak"}</span>
      </li>
      <li className="rewardsstrip__item">
        <TrendingUpIcon width={20} height={20} />
        <span className="rewardsstrip__count">{best}</span>
        <span className="rewardsstrip__label">{labels?.best ?? "Best streak"}</span>
      </li>
    </ul>
  );
}
