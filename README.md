# Inanna Myth Bot

Posts a full Sumerian/Akkadian myth of Inanna to a Discord channel every ~3 days, in
numbered parts if the myth is too long for one message (each part capped at 1800
characters). Runs on a schedule via GitHub Actions — no server to keep running.

Eleven myths are included, cycling in order and looping back to the start once the
last one finishes: the Huluppu Tree, Inanna and Enki (theft of the mes), Inanna
Takes Command of Heaven, the Courtship of Inanna and Dumuzi, the Descent to the
Underworld (3 parts), Dumuzi's Dream, Inanna and Shukaletuda, Inanna and Mount
Ebih, Inanna and Bilulu, Ishtar and Gilgamesh (the Bull of Heaven), and the
Exaltation of Inanna (Enheduanna's hymn).

## How it works

- `myths.json` holds a factual outline (characters, sequence of events) for each
  myth, split into parts. These are my own notes drawn from public-domain ancient
  sources and general scholarship — not copied from any modern translation.
- Each run, the bot sends that part's outline to the Claude API and asks it to
  write an **original** narrative retelling from those beats — never a quote or
  close paraphrase of Wolkstein's (or anyone else's) copyrighted translation —
  capped at 1800 characters. That keeps every post fresh, legally clean, and
  exactly the right length instead of you needing to hand-write and re-paste text.
- The result posts to your Discord channel via a webhook, as a gold embed with a
  footer crediting the sources that informed it.
- `state.json` tracks which myth/part is next and when the last post went out. The
  GitHub Action runs once a day but the script only actually posts once ~3 days
  (66 hours, to leave a little slack for a delayed cron run) have passed since the
  last one — this avoids the drift you'd get trying to express "every 3 days" as a
  raw cron pattern.
  After posting, the workflow commits the updated `state.json` back to the repo.

## Setup

### 1. Create the Discord webhook

In your Discord server: **Server Settings → Integrations → Webhooks → New
Webhook**. Pick the channel you want the myths posted to, copy the Webhook URL.
That's `DISCORD_WEBHOOK_URL` below — no bot invite or bot token needed for this
piece, since a webhook is enough to post messages.

### 2. Get your Anthropic API key

From the Anthropic Console (console.anthropic.com) — you likely already have one
of these set up as a secret for your prayer bot; you can reuse the same key here.

### 3. Push this repo to GitHub (or add it to your existing bots repo)

```
git init
git add .
git commit -m "Inanna myth bot"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

### 4. Add repo secrets

**Settings → Secrets and variables → Actions → New repository secret**:

- `ANTHROPIC_API_KEY`
- `DISCORD_WEBHOOK_URL`

### 5. Check workflow permissions

**Settings → Actions → General → Workflow permissions** → set to "Read and write
permissions" so the Action can commit the updated `state.json` back after each
post.

### 6. Test it

You can trigger a manual run any time from the **Actions** tab → "Post Inanna
myth" → **Run workflow**, checking the "force" input to skip the 3-day check.

To test locally before pushing:

```
npm install    # no dependencies currently, but harmless
cp .env.example .env   # fill in your real values
node --env-file=.env index.js            # real run, will post + advance state
DRY_RUN=true node --env-file=.env index.js   # prints what it WOULD post, no post, no state change
FORCE_POST=true DRY_RUN=true node --env-file=.env index.js  # ignore the 3-day gate too
```

## Sanity-checking the rotation

If you edit `myths.json` (reorder, add, or remove myths/parts), you can confirm
the rotation and 3-day gate logic still behave correctly without touching Discord
or spending API calls:

```
node test-rotation.mjs
```

This simulates two full cycles through the myth list and checks it wraps back to
the start correctly, plus a few checks on the "is it due to post yet" logic.

## Adjusting things

- **Posting time:** edit the `cron` line in `.github/workflows/post-myth.yml`
  (currently ~16:17 UTC daily — the script's own 3-day check decides whether that
  particular day's run actually posts).
- **Character limit:** `POST_CHAR_LIMIT` env var, default 1800.
- **Embed color:** `EMBED_COLOR_HEX` env var, default gold (`0xD4AF37`) to match
  your prayer bot's styling — change to taste.
- **Model:** `ANTHROPIC_MODEL` env var. Defaults to `claude-sonnet-4-5` — check
  the Anthropic docs for the current recommended model ID if this drifts out of
  date, and update the default in `src/generateText.js` or set the env var.
- **Add/remove/reorder myths:** edit `myths.json`. Each myth needs `id`, `title`,
  `characters`, `context`, and a `parts` array where each part has a `beats` array
  (short factual bullet points — the model turns these into prose, so keep them
  as plain facts, not finished sentences, to avoid biasing it toward copying any
  particular phrasing). If you reorder or add/remove myths, note that `state.json`
  currently points at an index into that list — reset `mythIndex`/`partIndex` to
  `0` after a reorder if you don't want it to jump to an unexpected myth.
- **Skip a forced re-post of a myth already covered:** manually edit `state.json`
  and push it.

## A note on the source material

Diane Wolkstein & Samuel Noah Kramer's *Inanna: Queen of Heaven and Earth* (1983)
is still under copyright — the bot doesn't quote it, and the system prompt sent to
Claude explicitly instructs it not to reproduce or closely paraphrase her (or any
other specific translator's) wording. What's public domain is the underlying
~4,000-year-old myth content itself (which sequence of events happens to whom),
which is what `myths.json` encodes. The Discord posts credit Wolkstein's book
alongside the freely available Electronic Text Corpus of Sumerian Literature
(etcsl.orinst.ox.ac.uk) as the scholarship that informed the retelling, without
claiming to reproduce either.
