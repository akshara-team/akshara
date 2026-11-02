import { useNavigate } from "react-router-dom";
import { BookIcon, CheckIcon, PageHeader, UsersIcon } from "../../components";
import { useSession } from "../../state/session";
import { setLanguage as persistLanguage } from "../../state/storage";
import { LANGS, scriptClass, scriptEnglish, scriptName, type Lang } from "../../theme/script";

const HELLO: Record<Lang, string> = {
  "kn-IN": "ನಮಸ್ಕಾರ! ಬನ್ನಿ, ಓದೋಣ.",
  "ta-IN": "வணக்கம்! வாங்க, படிக்கலாம்.",
  "hi-IN": "नमस्ते! आइए, पढ़ें.",
};

/** The first letter of each script: what a child recognises before any word. */
const FIRST_LETTER: Record<Lang, string> = {
  "kn-IN": "ಅ",
  "ta-IN": "அ",
  "hi-IN": "अ",
};

export function RoleSelection() {
  const { lang, setLang } = useSession();
  const navigate = useNavigate();

  return (
    <>
      <PageHeader />
      <section className="welcome-hero">
        <div className="welcome-hero__copy">
          <h1 className="welcome-hero__title">A little reading. A lot of fun!</h1>
          <p className={`welcome-hero__hello ${scriptClass(lang)}`} lang={lang}>
            {HELLO[lang]}
          </p>
          <p className="welcome-hero__school">Govt Primary School, Mandya · demo school</p>
        </div>
        <div className="welcome-hero__tiles" aria-hidden="true">
          {LANGS.map((l) => (
            <span key={l} className={`akshara-tile ${scriptClass(l)}`} lang={l} data-on={l === lang}>
              {FIRST_LETTER[l]}
            </span>
          ))}
        </div>
      </section>

      <div className="screen-body welcome-body">
        <section className="welcome-step" aria-labelledby="step-lang">
          <h2 className="step" id="step-lang">
            <span className="step__num">1</span>
            <span className="step__label">Pick your language</span>
          </h2>
          <div className="script-tiles" role="radiogroup" aria-labelledby="step-lang">
            {LANGS.map((l) => {
              const on = l === lang;
              return (
                <button
                  key={l}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  className="script-tile"
                  onClick={() => {
                    setLang(l);
                    persistLanguage(l);
                  }}
                >
                  <span className={`script-tile__letter ${scriptClass(l)}`} lang={l} aria-hidden="true">
                    {FIRST_LETTER[l]}
                  </span>
                  <span className={`script-tile__name ${scriptClass(l)}`} lang={l}>
                    {scriptName(l)}
                  </span>
                  <span className="script-tile__en">{scriptEnglish(l)}</span>
                  {on && <CheckIcon className="script-tile__check" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </section>

        <section className="welcome-step" aria-labelledby="step-role">
          <h2 className="step" id="step-role">
            <span className="step__num">2</span>
            <span className="step__label">Who are you?</span>
          </h2>
          <div className="role-grid">
            <button
              type="button"
              className="rolecard rolecard--read"
              onClick={() => navigate("/reader")}
            >
              <span className="rolecard__icon" aria-hidden="true">
                <BookIcon width={40} height={40} />
              </span>
              <span className="rolecard__title">I am reading</span>
              <span className="rolecard__sub">Choose a story and read it aloud</span>
            </button>
            <button
              type="button"
              className="rolecard rolecard--teacher"
              onClick={() => navigate("/teacher")}
            >
              <span className="rolecard__icon" aria-hidden="true">
                <UsersIcon width={40} height={40} />
              </span>
              <span className="rolecard__title">I am a teacher</span>
              <span className="rolecard__sub">Choose stories and follow progress</span>
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
