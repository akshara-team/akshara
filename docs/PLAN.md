# Research and Project Plan

*Research date: Oct 17, 2026. Deadline: **Nov 10, 2026, 11:59 PM IST**.*

## TL;DR

- We dropped the scam-call idea (Kavach): another team has built it on all three Gnani models, with 50 commits and its own evals.
- **We're building a reading screener and practice tool for early-grade children in Kannada, Tamil and Hindi.** No challenge entry we found does this, it fits the credit budget, and it uses each Gnani model where it's strongest.
- **The headline is a measured reliability study of Prisma** on child-style reading errors, including phone-quality (8 kHz) audio. Every Prisma benchmark we found was run by Gnani, so an independent one is our strongest asset, for the post and for the interview.
- **Week 1 has a go/no-go test** ([GO_NO_GO.md](GO_NO_GO.md)) before we build the rest. The test audio is synthetic (Timbre reads passages with planted mistakes), because neither of us can record Kannada, Tamil and Hindi.
- **Honest framing:** a screener that tells a teacher which children to listen to first, not a replacement for the teacher. Clean synthetic audio is easier than a classroom, and we say so.

## 1. What other teams are building

About 30 identifiable challenge entries on GitHub. Almost all have 0 stars, so the demo video and LinkedIn engagement will separate entries.

| Theme | Entries found | Status |
|---|---|---|
| Scam-call detection | Kavach, VoiceShield-AI, ScamAnalysis | Taken |
| Government schemes / civic helplines | Dhwani Desk (Kannada), Kural (Tamil schemes + Evon), Bolo form-filler | Taken |
| Farmers | KisanSetu (two repos) | Taken |
| Kirana / small shops | kirana-voice-orders, DukaanSaathi | Taken |
| Health | sehat-saathi, sehat-diary, IndicVoiceCare | Crowded |
| Call analytics, interpreter, field ops | SunoAI, saathi, voice-ops-line, DriveOS | Taken |

## 2. How good the Gnani models are

### Prisma v2.5 (speech-to-text): decent, with quirks

- All benchmarks we found were run by Gnani. No independent tests.
- Kavach measured about **5% character error** on Hindi over a simulated phone line.
- Reported problems: clips over 30 s rejected (docs say 60), HTTP 429 on two quick requests, partial transcripts need an undocumented `x-partials` header, `connected` event always reports 16 kHz.

### Evon v3.3 (LLM): design around its weak spots

| Task | Evon | Comparison |
|---|---|---|
| Following instructions (IndicIFEval) | 47 | Gemma-4-31B: 81 |
| Summarising (CrossSum-in) | 4.7 | Gemma-4-31B: 23 |
| Indic knowledge (MILU) | 78.7 | Sarvam-105B: 75.7 |
| Indic question answering (XQuAD-in) | 64.6 | Sarvam-105B: 56.7 |

- Tool use is "still in development". It rambles unless forced into a strict output format.
- **Use it only for short, structured outputs in Indian languages.** No tool-calling, no summaries.
- Weights are free to download; quantized versions exist. Self-hosting costs no Gnani credits.

### Timbre v3.0 (text-to-speech): an edge nobody is using

- 13 voices, each speaking all 10 languages, with emotion tags (`<excited>`, `<laugh>`, `<whispers>`, `<slow>`, `<pauses>`).
- Every competitor found uses v2.5.

## 3. Credits

- Gnani gives each participant 5,000 programme credits, in the **primary registrant's account** and shared between us. Only speech-to-text and text-to-speech use credits.
- **Measured:** 20.15 credits for 325 short requests, about 0.05 to 0.1 per request ([GNANI_API.md](GNANI_API.md#credit-rates)). At that rate the evaluation work is a rounding error against 5,000.
- Long audio, streaming and a live demo may cost differently, so measure before assuming. Keep caching transcripts and generated audio, and keep the spend cap in `src/akshara/ledger.py`.

## 4. The idea

See the [README](../README.md#how-it-works) for the flow and [ARCHITECTURE.md](ARCHITECTURE.md) for the design.

### Why it can stand out

- **Awards:** Main Character (Kannada, Tamil), Real Deal, Small Town Big Build, Demo Day Drop. A child's score going up is a strong video.
- Each Gnani model does what it's good at.
- About one minute of speech-to-text per attempt; each story is voiced once.
- An honest measurement of how well it catches reading mistakes ([EVALS.md](EVALS.md)).

### Main risk

Speech-to-text models tend to "fix" a misread word into the right one, hiding the mistake. Word-boosting the story's words (`bias_list`) would make this worse, so we don't use it. The go/no-go test measures this directly.

### Story: diagnose, mitigate, prove (revised Oct 20)

The pipeline alone is simple and every entrant uses AI coding, so the weight is on the finding. Prisma catches 95–100% of planted mistakes, but near-sound swaps that fit the sentence are sometimes autocorrected (25/29 caught vs 29/29 for distant swaps; p = 0.11, suggestive). The plan:

1. **Chunked re-check (main mitigation).** Transcribe short pieces without the sentence around them, so there is little context to autocorrect from. Measure catch and false-flag rate against the whole-sentence baseline on the same clips. Risks: more false flags, and Prisma returns no word timings or confidence (checked on the REST docs), so pauses have to be found from the audio itself.
2. **Larger, more varied study** to settle the p = 0.11 question and to add error types beyond swaps.
3. **Real product** with the mitigation inside: live mic, green/red words, per-attempt trace, class summary.
4. **Stretch only:** a second opinion from AI4Bharat IndicConformer. Checked: Hindi and Kannada checkpoints exist but are gated and need the AI4Bharat NeMo fork; no Tamil-specific checkpoint was found (the 22-language 600M model may cover it, unverified); the licence is reported as MIT or CC BY 4.0 depending on the page, so read the model card before any use.

Related work (checked): the "ASR autocorrects reading errors" problem is described in a practitioner article, and a Dutch Interspeech 2023 study found that putting reading errors in the language model helps. We found no published substitution-detection rate for a cloud API on Indian-language reading, which is the gap this fills. We do not claim the effect is new, only that it is measured here for these three languages.

Limits stay the same: synthetic voices, not validated on children, passages not native-reviewed. A well-measured study with a working fix, not a research breakthrough.

## 5. Runner-up (if the go/no-go test fails)

A voice explainer for official papers: photograph a government letter, electricity bill or medicine strip and hear it explained in Kannada, Tamil or Hindi, with the source cited. Reuses Helix's document ingestion and citations.

## 6. How the challenge picks people (from Gnani's pages)

- **Two gates.** "Verified engagement on your public demo decides the shortlist. Your skills and your interview decide the offer." Engagement means reactions, comments and reshares on the nominated posts, counted at the closing cutoff. No weights or thresholds are published.
- **Awards are separate** (10 × ₹50,000, judged on category criteria; one award per team). Targets: Main Character (Kannada, Tamil), Real Deal, Demo Day Drop. Small Town Big Build depends on where our colleges are.
- **Interviews are one to one and individual.** Each of us needs to be able to explain and defend our own part.
- **Banned:** bought engagement, bots, engagement swaps, paid promotion, misleading demos. Gnani's own advice: a demo that shows an honest limitation beats one that fakes a result.
- **What Gnani sells:** voice AI to large enterprises (mostly banking and finance), so telephony audio, Indian languages and measured accuracy are what they care about. Education is adjacent, which is why the reliability study, including 8 kHz audio, is the bridge.
- **Engagement plan (legitimate only):** post the demo video by about Nov 1–3, not Nov 10, so it can collect reactions before the cutoff. Open with the child-reading problem, then the live demo. Share with education and NGO people, regional-language communities and our college networks.
- **Not verified:** the scoring weights, the engagement threshold, how many teams entered, and which intern roles exist.

## 7. Scope: what goes in and what stays out

**In:** the scorer (with akshara/syllable-level error categories if time allows), Prisma, Timbre and, optionally, Evon; an "uncertain" state for words the system can't judge; a per-language reliability report with failure cases; a per-attempt trace and cost summary; a minimal reading screen (words turn green or red) and a class summary.

**Evon is off the critical path.** Passages for assessment come from a fixed, graded bank. Evon is used for optional story variety only, if we get it running.

**Out (roadmap in the docs only):** child-speech model training, offline mobile apps, DPDP compliance work, LangGraph or other agent frameworks around the main flow, realtime streaming unless the basics are done early, anything needing real children's recordings.

## 8. How we work

The code and experiments are largely AI-assisted. Achindra and the partner have very little time, so **the plan assumes no passage review, no teacher outreach and no public testing.** Everything that would normally need a person is replaced by something checkable, and the limits are stated openly. Every other entrant also uses AI coding, so code volume and a polished README don't set us apart. These do:

- **Real numbers from a live API and an honest failure analysis**, not a mock.
- **Content we didn't write.** Passages come from published, openly licensed children's books (StoryWeaver, CC BY 4.0) with their reading levels, not from sentences we composed. This avoids Kannada and Tamil errors by us. The `spec.*.jsonl` passages written so far are placeholders for the pipeline test only.
- **Automatic checks instead of reviewers.** A clean-read control (Timbre reads the correct text, Prisma transcribes it) catches unpronounceable or garbled passages and gives the false-flag baseline. Every number in the docs is generated by a script and checked against the report file.
- **Real human speech from open datasets is optional and gated.** It would give a false-flag baseline on non-TTS voices (for example FLEURS; licence and download not yet verified). The challenge rules say synthetic data only, so we use it **only if Gnani confirms on Discord** that public read-speech datasets are allowed. Otherwise we skip it. Child-like audio is simulated by pitch and speed shifts and labelled as a proxy.
- **Stated limits.** Not validated on children, passages not reviewed by a native speaker, clean and simulated audio only. The page itself says an honest limitation beats a faked result.
- **Credits are the real constraint.** The code enforces a spend cap and caches everything.
- **Defensibility in the interview.** Each of us is interviewed alone, so the code stays small, with a one-page walkthrough per module and a decision log in `docs/DECISIONS.md`.

### What we ask of the two of you (about 2 hours total)

1. Put the API key in `.env` (5 minutes, once).
2. Answer a few short decision questions when asked (pick a voice from samples, approve a threshold).
3. Read the walkthrough pages once before interviews.
4. Post the demo on LinkedIn or X from your own accounts with the caption I draft (10 minutes each). Screen-record the demo if I can't produce the video myself.

## 9. Timeline

| When | What |
|---|---|
| Oct 19–20 | Done: API key, credit-rate check, go/no-go run, 7 audio conditions, context experiment (see RESULTS.md) |
| Oct 21–26 | **Mitigation study:** chunked re-check (cut audio at pauses, transcribe 1–3 word pieces) tested on the near-sound swaps; larger sample (about 100 items per condition) from openly licensed passages; more error types (half-said, repeated, self-corrected) |
| Oct 27–Nov 1 | Whole loop with the mitigation inside: reading screen, per-attempt trace, class summary; demo video built with Timbre narration |
| Nov 1–3 | You post the demo (engagement window opens) |
| Nov 4–9 | Fix findings, final numbers, docs, walkthroughs |
| Nov 10 | Submit before 11:59 PM IST |

### Build plan (Oct 21–Nov 9)

Goal: a project whose claims stay true without child or native-speaker testing. The claim is narrow and measured: "this catches X% of planted mistakes on synthetic speech under these conditions, and here is where it fails."

| # | Work | Done when | Credits (est.) |
|---|---|---|---|
| 1 | **Passages we didn't write.** Pick short StoryWeaver (CC BY 4.0) passages per language with their reading levels; record title, licence and URL per passage. Check Tamil coverage first; if thin, say so | 20+ passages per language in `data/`, source list in docs | 0 |
| 2 | **Error types.** Extend the plant tool to skips, swaps, half-said words, repetitions and self-corrections; scorer reports each type | Tests per type; scorer table by type | 0 |
| 3 | **Bigger study.** About 100 planted items per condition, same clean/phone/noise/child-proxy conditions, with Wilson intervals | Numbers regenerate from cached transcripts with one command | ~30 |
| 4 | **Chunked re-check.** Find pauses in the audio, transcribe 1–3 word pieces, merge. Compare catch and false-flag rate with whole-sentence on the same clips. Prediction written down before the run | Result reported whether it helps or not | ~20 |
| 5 | **"Check this word" state.** Words that are near-identical in sound to a strongly predicted word, or disagree between the two passes, are marked uncertain instead of green | Rate of uncertain words and what it costs in catch reported | 0 |
| 6 | **Reading screen and class summary.** FastAPI plus browser mic; words green, red or uncertain; per-attempt trace of what was heard; class summary from synthetic learners | Works end to end on live Prisma and Timbre; 8 kHz mode shown | ~15 |
| 7 | **Demo and docs.** 60 s video, written explanation, walkthrough per module, `docs/DECISIONS.md`, caption drafts, repo public | Submission checklist ticked | ~5 |

Order: 1 and 2 first (no credits), then 3 and 4 together, then 5, then 6. If 4 does not improve catch, we report that and spend the freed time on 6 and 7; the study and the app still stand.

**Cut lines if time runs short:** drop 5 first, then the half-word and self-correction types, then class summary polish. Never cut the limits section or the regenerate-from-cache command.

**What stays unfixable and is stated in the docs:** real children's speech may behave differently, Tamil is the weakest language, and the audio is synthetic.

Log your work in [WORKLOG.md](WORKLOG.md). Each of us is evaluated and interviewed separately.

### Submission checklist

- [ ] Registration (both of us)
- [ ] Project description: problem, users, Gnani models used, each person's role
- [ ] Working demo or video, plus a written explanation
- [ ] Public LinkedIn or X post with #GnaniAI #GreatIndianAIInternshipChallenge
- [ ] Clear documentation of how we use each Gnani API
- [ ] Synthetic data only
- [ ] Repo made public

## Sources

**Gnani:** [Models](https://www.gnani.ai/models) · [Evon model card](https://huggingface.co/gnani/gnani-evon-v3.3-30B-A3B) · [Docs](https://docs.gnani.ai/api/introduction/introduction) · [Audio tags](https://docs.gnani.ai/api/TTS/tts-audio-tags) · [Challenge](https://www.gnani.ai/internship) · [Challenge blog](https://www.gnani.ai/resources/blogs/great-indian-ai-internship-challenge-2026) · [Prisma benchmarks](https://www.gnani.ai/resources/prisma-v2-5-stt-benchmarks)

**Pricing:** [Caller.digital teardown](https://caller.digital/blog/voice-ai-vendor-pricing-teardown-india-2026)

**Competitors:** [Kavach](https://github.com/abhishek-pandey7/Kavach-Realtime-Voice-Threat-Intelligence) · [Dhwani Desk](https://github.com/Pranav-0710/dhwani-desk) · [KisanSetu](https://github.com/aniket25042005/kisan_setu_gnani_ai_challenge) · [boli-zero](https://github.com/sameer261h/boli-zero) · [SunoAI](https://github.com/neha-tanti/sunoai) · [Bolo](https://github.com/krunalbaraskar/gnani)

**Reading:** [ASER 2024](https://ruralindiaonline.org/en/library/resource/annual-status-of-education-report-rural-2024) · [Wadhwani AI ORF](https://www.wadhwaniai.org/impact/education-solutions/oral-reading-fluency/) · [Wadhwani ORF program](https://wadhwaniai.org/programs/oral-reading-fluency-ai-solution) · [ORF paper](https://arxiv.org/html/2405.19426v2) · [Read Along](https://techcrunch.com/?p=1985326)
