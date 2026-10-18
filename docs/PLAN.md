# Research and Project Plan

*Research date: Oct 17, 2026. Deadline: **Nov 10, 2026, 11:59 PM IST**.*

## TL;DR

- We dropped the scam-call idea (Kavach): another team has built it on all three Gnani models, with 50 commits and its own evals.
- **We're building a reading-fluency tutor for children in Kannada, Tamil and Hindi.** No challenge entry we found does this, it fits the credit budget, and it uses each Gnani model where it's strongest.
- **Week 1 has a go/no-go test** ([GO_NO_GO.md](GO_NO_GO.md)) before we build the rest.

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

- No published per-minute rates. We have about ₹1000 of credits in the **primary registrant's account**, shared between us.
- Only speech-to-text and text-to-speech use credits.
- **First thing to do:** one 60 s speech-to-text call and one 500-character text-to-speech call, then read the dashboard. Record the rates in [GNANI_API.md](GNANI_API.md#credit-rates).
- Keep usage low: short clips, cache every transcript and every generated audio file, never stream silence.

## 4. The idea

See the [README](../README.md#how-it-works) for the flow and [ARCHITECTURE.md](ARCHITECTURE.md) for the design.

### Why it can stand out

- **Awards:** Main Character (Kannada, Tamil), Real Deal, Small Town Big Build, Demo Day Drop. A child's score going up is a strong video.
- Each Gnani model does what it's good at.
- About one minute of speech-to-text per attempt; each story is voiced once.
- An honest measurement of how well it catches reading mistakes ([EVALS.md](EVALS.md)).

### Main risk

Speech-to-text models tend to "fix" a misread word into the right one, hiding the mistake. Word-boosting the story's words (`bias_list`) would make this worse, so we don't use it. The go/no-go test measures this directly.

## 5. Runner-up (if the go/no-go test fails)

A voice explainer for official papers: photograph a government letter, electricity bill or medicine strip and hear it explained in Kannada, Tamil or Hindi, with the source cited. Reuses Helix's document ingestion and citations.

## 6. Timeline

| When | What |
|---|---|
| Oct 18–23 | Check credit rates, run the go/no-go test, get Evon running |
| Oct 24–30 | Full loop: story → read-aloud → scoring → feedback |
| Oct 31–Nov 6 | Teacher dashboard, eval scorecard in the README |
| Nov 7–10 | Demo video, LinkedIn/X post, submit |

### Who does what

| Person | Owns |
|---|---|
| Achindra (Hindi) | Backend: Evon hosting, speech pipeline, scoring, Hindi tests |
| Partner (Kannada, Tamil) | Kannada and Tamil stories and test passages, voice choice, frontend, demo video |

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
