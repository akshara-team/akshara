import { useNavigate } from "react-router-dom";
import { api } from "../../api";
import { STORY } from "../../api/teacherData";
import { BookIcon, Button, Card, ListenButton, Select, PageHeader } from "../../components";
import { useSession } from "../../state/session";
import { scriptClass } from "../../theme/script";

export function SelectStory() {
  const navigate = useNavigate();
  const { lang, setLang, beginPassage, reader } = useSession();

  async function start() {
    const passages = await api.listPassages(lang);
    const passage = passages[0] ?? {
      id: STORY.id,
      language: lang,
      text: STORY.preview,
    };
    beginPassage(passage, api.partsOf(passage));
    navigate(`/read/${passage.id}`);
  }

  const childName = reader?.alias.split(" ")[0] ?? "the child";

  return (
    <>
      <PageHeader
        back
        backTo="/teacher"
        badge={childName}
        nav={[
          { label: "Class", to: "/teacher" },
          { label: "Story", to: "/teacher/story" },
          { label: "Add child", to: "/teacher/add" },
        ]}
      />
      <div className="screen-body">
        <p className="eyebrow">Demo · Static state</p>
        <p className="card__title">
          Choose a story for {childName} <BookIcon className="inline-icon" />
        </p>
        <p className="reader-meta">Pick a language and level to get started!</p>

        <div className="workspace workspace--w300">
          {/* Left: lesson setup (300 wide in the frame). */}
          <div className="stack">
            <Select
              label="Reading language"
              value={lang}
              onChange={(v) => setLang(v as typeof lang)}
              options={[
                { value: "kn-IN", label: "ಕನ್ನಡ · Kannada" },
                { value: "ta-IN", label: "தமிழ் · Tamil" },
                { value: "hi-IN", label: "हिंदी · Hindi" },
              ]}
            />

            <p className="note">
              {STORY.parts} short parts · about {STORY.seconds} seconds of reading in total
            </p>

            <ListenButton text={STORY.preview} lang={lang} block />
            <Button block onClick={start}>
              Start session
            </Button>
            <Button variant="ghost" block onClick={() => navigate("/reader")}>
              Read as the child instead
            </Button>
          </div>

          {/* Right: story content (868 wide in the frame). */}
          <div className="stack">
            <Card>
              <p className={`metarow__title ${scriptClass(lang)}`}>{STORY.title}</p>
              <p className="reader-meta">
                {STORY.english} · {STORY.words} words
              </p>
              <p className={`reading-text ${scriptClass(lang)}`}>{STORY.preview}</p>
            </Card>

            <Card>
              <p className="eyebrow">Part 2 preview</p>
              <p className={`reading-text ${scriptClass(lang)}`}>
                ಕೆಂಪು ಹೂವು ಬಹಳ ಸುಂದರವಾಗಿತ್ತು.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
