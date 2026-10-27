"""Meta's MMS-1b-all speech model as an evidence source (frame-by-frame letter probabilities).

Why this model: one open model for Hindi, Kannada and Tamil (a small adapter per language), it
writes each language's own script letter by letter, and it has no language model, so unlike a
production transcriber it is not pulled towards real words.

Licence: CC BY-NC 4.0 (non-commercial). Fine for research and the challenge; a commercial build
would swap in an MIT-licensed model such as AI4Bharat's IndicConformer (docs/DECISIONS.md).

Needs the optional `evidence` dependency group: `uv sync --group evidence`. Set `HF_HOME` to put
the ~4 GB download somewhere with space. Emissions are cached per clip, so re-runs are instant.
"""

import hashlib
import json
from pathlib import Path

import numpy as np
from scipy.signal import resample_poly

from akshara.core.wavio import read_wav
from akshara.evidence.ctc import log_softmax
from akshara.evidence.words import Emissions, WordEvidence, check

MODEL_ID = "facebook/mms-1b-all"
ADAPTER = {"hi-IN": "hin", "kn-IN": "kan", "ta-IN": "tam"}
RATE = 16000
FRAME_S = 320 / RATE  # the model emits one frame per 320 samples


class MMS:
    name = "mms-1b-all"

    def __init__(self, cache_dir: Path | None = None):
        self.cache_dir = cache_dir
        self._model = None
        self._processor = None
        self._lang: str | None = None

    def _use(self, lang: str) -> None:
        from transformers import AutoProcessor, Wav2Vec2ForCTC

        code = ADAPTER[lang]
        if self._model is None:
            self._processor = AutoProcessor.from_pretrained(MODEL_ID, target_lang=code)
            self._model = Wav2Vec2ForCTC.from_pretrained(
                MODEL_ID, target_lang=code, ignore_mismatched_sizes=True
            ).eval()
        elif self._lang != code:
            self._processor.tokenizer.set_target_lang(code)
            self._model.load_adapter(code)
        self._lang = code

    def emissions(self, audio: Path, lang: str) -> Emissions:
        key = hashlib.sha256(audio.read_bytes() + f"{lang}:{MODEL_ID}".encode()).hexdigest()[:24]
        cached = self.cache_dir / f"{key}.npz" if self.cache_dir else None
        if cached and cached.exists():
            z = np.load(cached)
            meta = json.loads(str(z["meta"]))
            return Emissions(z["logp"].astype(np.float64), FRAME_S, **meta)

        import torch

        self._use(lang)
        x, rate = read_wav(audio)
        wav = x.astype(np.float32) / 32768.0
        if rate != RATE:
            wav = resample_poly(wav, RATE, rate).astype(np.float32)
        inputs = self._processor(wav, sampling_rate=RATE, return_tensors="pt")
        with torch.inference_mode():
            logits = self._model(**inputs).logits[0].numpy().astype(np.float64)
        tok = self._processor.tokenizer
        vocab = {t: i for t, i in tok.get_vocab().items() if len(t) == 1 or t == "|"}
        meta = {"vocab": vocab, "blank": tok.pad_token_id, "sep": vocab.get("|")}
        logp = log_softmax(logits)
        if cached:
            cached.parent.mkdir(parents=True, exist_ok=True)
            np.savez_compressed(cached, logp=logp.astype(np.float32), meta=json.dumps(meta))
        return Emissions(logp, FRAME_S, **meta)

    def evidence(self, audio: Path, lang: str, words: list[str]) -> list[WordEvidence] | None:
        return check(self.emissions(audio, lang), words, lang)
