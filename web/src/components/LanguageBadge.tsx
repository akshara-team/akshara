import { scriptClass, scriptName, type Lang } from "../theme/script";

export function LanguageBadge({ lang }: { lang: Lang }) {
  return <span className={`langbadge ${scriptClass(lang)}`}>{scriptName(lang)}</span>;
}
