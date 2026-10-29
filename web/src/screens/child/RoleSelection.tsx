import { useNavigate } from "react-router-dom";
import {
  BookIcon,
  Button,
  Card,
  HandIcon,
  Radio,
  StarIcon,
  PageHeader,
  UsersIcon,
} from "../../components";
import { useSession } from "../../state/session";
import { setLanguage as persistLanguage } from "../../state/storage";
import { LANGS, scriptClass, scriptEnglish, scriptName, type Lang } from "../../theme/script";

const HELLO: Record<Lang, string> = {
  "kn-IN": "ನಮಸ್ಕಾರ! ಬನ್ನಿ, ಓದೋಣ.",
  "ta-IN": "வணக்கம்! வாங்க, படிக்கலாம்.",
  "hi-IN": "नमस्ते! आइए, पढ़ें.",
};

export function RoleSelection() {
  const { lang, setLang } = useSession();
  const navigate = useNavigate();

  return (
    <>
      <PageHeader />
      <div className="hero">
        <h1 className="hero__title">A little reading.</h1>
        <p className="hero__sub">
          A lot of fun! <StarIcon className="inline-icon" />
        </p>
      </div>

      <div className="screen-body">
        <div className="workspace workspace--w360">
          {/* Left: greeting and language. */}
          <div className="stack">
            <Card>
              <div className="greeting">
                <p className="eyebrow">Welcome · Demo school</p>
                <p className="greeting__school">Govt Primary School, Mandya</p>
                <p className={`greeting__hello ${scriptClass(lang)}`} lang={lang}>
                  {HELLO[lang]} <HandIcon className="inline-icon" />
                </p>
              </div>
            </Card>

            <div className="step">
              <span className="step__num">1</span>
              <span className="step__label">Pick your language</span>
            </div>
            <div className="stack" role="radiogroup" aria-label="Reading language">
              {LANGS.map((l) => (
                <Radio
                  key={l}
                  selected={l === lang}
                  onSelect={() => {
                    setLang(l);
                    persistLanguage(l);
                  }}
                >
                  <span className={scriptClass(l)} lang={l}>{scriptName(l)}</span>{" "}
                  <span className="reader-meta">{scriptEnglish(l)}</span>
                </Radio>
              ))}
            </div>
          </div>

          {/* Right: role and start. */}
          <div className="stack">
            <div className="step">
              <span className="step__num">2</span>
              <span className="step__label">Who are you?</span>
            </div>

            <button type="button" className="rolecard" onClick={() => navigate("/reader")}>
              <span className="rolecard__icon" aria-hidden="true">
                <BookIcon width={28} height={28} />
              </span>
              <span>
                <span className="rolecard__title">I am reading</span>
                <span className="rolecard__sub">Choose a story and read it aloud</span>
              </span>
              <span className="rolecard__arrow" aria-hidden="true">
                ›
              </span>
            </button>

            <button type="button" className="rolecard" onClick={() => navigate("/teacher")}>
              <span className="rolecard__icon" aria-hidden="true">
                <UsersIcon width={28} height={28} />
              </span>
              <span>
                <span className="rolecard__title">I am a teacher</span>
                <span className="rolecard__sub">Choose stories · Track progress</span>
              </span>
              <span className="rolecard__arrow" aria-hidden="true">
                ›
              </span>
            </button>

            <p className="note">
              Children read. Teachers choose stories and follow progress.
            </p>

            <div className="actions">
              <Button block icon="book" onClick={() => navigate("/reader")}>
                Start reading
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
