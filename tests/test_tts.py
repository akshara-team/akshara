import io
import wave

from akshara.providers.timbre import fix_wav_header


def test_fix_wav_header_sets_real_sizes():
    pcm = b"\x01\x00" * 16000
    fmt = b"fmt " + (16).to_bytes(4, "little") + bytes([1, 0, 1, 0]) + (16000).to_bytes(4, "little")
    fmt += (32000).to_bytes(4, "little") + bytes([2, 0, 16, 0])
    streamed = b"RIFF\xff\xff\xff\xffWAVE" + fmt + b"data\xff\xff\xff\xff" + pcm
    with wave.open(io.BytesIO(fix_wav_header(streamed))) as w:
        assert w.getnframes() == 16000
        assert w.getframerate() == 16000
