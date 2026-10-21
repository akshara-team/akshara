import { useNavigate } from "react-router-dom";
import { api } from "../../api";
import { STORY } from "../../api/teacherData";
import { BookIcon, Button, Card, Select, TopBar } from "../../components";
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

  return (
    <>
      <TopBar back backTo="/teacher" />
      <div className="hero">
        <h1 className="hero__title">
          Choose a story for {reader?.alias.split(" ")[0] ?? "the child"}{" "}
          <BookIcon className="inline-icon" />
        </h1>
        <p className="hero__sub">Pick a language and level to get started!</p>
      </div>

      <div className="screen-body">
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

        <Card>
          <p className="eyebrow">Demo · Static state</p>
          <p className={`metarow__title ${scriptClass(lang)}`}>{STORY.title}</p>
          <p className="reader-meta">
            {STORY.english} · {STORY.words} words
          </p>
          <p className={`reading-text ${scriptClass(lang)}`}>{STORY.preview}</p>
          <p className="note">
            {STORY.parts} short parts · about {STORY.seconds} seconds of reading in total
          </p>
        </Card>

        <div className="actions">
          <Button block onClick={start}>
            Start session
          </Button>
          <Button variant="ghost" block onClick={() => navigate("/reader")}>
            Read as the child instead
          </Button>
        </div>
      </div>
    </>
  );
}
