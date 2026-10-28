"""Client for Gnani Evon v3.3, self-hosted behind an OpenAI-compatible API (vLLM or
llama.cpp's server). Evon's weights are open, so it costs no Gnani credits, but it does not run
on a laptop (30B parameters), so it is only used in offline batches: see docs/EVON_HOWTO.md.

    EVON_BASE_URL=http://host:8000/v1   EVON_MODEL=model   (EVON_API_KEY if the server has one)
"""

import os
import re

import httpx

from akshara.providers.base import ProviderError


class EvonError(ProviderError):
    pass


def chat(
    messages: list[dict],
    *,
    base_url: str | None = None,
    model: str | None = None,
    temperature: float = 0.6,  # the model card's setting, with top_p 0.95
    max_tokens: int = 400,
    timeout: float = 120.0,
    client: httpx.Client | None = None,
) -> str:
    """One chat completion; returns the reply text."""
    base = (base_url or os.environ.get("EVON_BASE_URL", "")).rstrip("/")
    if not base:
        raise EvonError("EVON_BASE_URL is not set (see docs/EVON_HOWTO.md)")
    key = os.environ.get("EVON_API_KEY")
    body = {
        "model": model or os.environ.get("EVON_MODEL", "model"),
        "messages": messages,
        "temperature": temperature,
        "top_p": 0.95,
        "max_tokens": max_tokens,
        # Evon reasons before answering unless told not to; a short JSON answer needs none.
        "chat_template_kwargs": {"enable_thinking": False},
    }
    http = client or httpx.Client(timeout=timeout)
    try:
        r = http.post(
            f"{base}/chat/completions",
            json=body,
            headers={"Authorization": f"Bearer {key}"} if key else {},
        )
    except httpx.HTTPError as e:
        raise EvonError(f"Evon unreachable: {e}") from e
    finally:
        if client is None:
            http.close()
    if r.status_code != 200:
        raise EvonError(f"Evon HTTP {r.status_code}: {r.text[:200]}")
    try:
        text = r.json()["choices"][0]["message"]["content"] or ""
    except (ValueError, KeyError, IndexError, TypeError) as e:
        raise EvonError(f"unexpected Evon reply: {r.text[:200]}") from e
    # a server without a reasoning parser can leave the thinking in the reply
    return re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()
