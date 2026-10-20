# Drafts to send to Gnani (you send them)

## Discord: open read-speech data
Hi Gnani team. We are building a reading screener for early-grade children in Kannada, Tamil and Hindi on Prisma v2.5 and Timbre v3.0. All our test audio is synthetic, as the rules require. Is there an openly licensed read-speech dataset (adult or child, any of the three languages) that entrants may use to check the transcriber on human voices? Or is synthetic-only the expected scope? Thanks.

## Support: Cloudflare 403 on some Prisma clips
Hi. A few of our short WAV clips (16 kHz mono, 4 to 11 s, made with Timbre) always return an HTTP 403 Cloudflare HTML page from the Prisma REST endpoint, on every retry, while similar clips succeed. Examples from our log: files named sw-958, sw-557049, sw-37201 (one each in Hindi, Kannada, Tamil), and two halting-test clips sw-30140 and sw-38483. We can send the audio. Is there a content or size rule we are hitting, and how should we avoid it?
