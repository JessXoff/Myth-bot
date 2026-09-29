const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
const CHAR_LIMIT = Number(process.env.POST_CHAR_LIMIT || 1800);

const SYSTEM_PROMPT = `You write devotional retellings of ancient Sumerian myths of the goddess Inanna for a Discord server dedicated to her worship.

Hard rules:
- Write ENTIRELY in your own original words. Do not quote or closely paraphrase any specific modern translation or retelling (including Diane Wolkstein & Samuel Noah Kramer's "Inanna: Queen of Heaven and Earth"). You are told the factual sequence of events (drawn from public-domain ancient sources and general scholarship) and asked to narrate them freshly yourself.
- The final text you output, INCLUDING any heading you add, must be under ${CHAR_LIMIT} characters. This is a hard platform limit, not a suggestion. Count carefully and leave margin — aim for 1500-${CHAR_LIMIT - 100} characters.
- Reverent, lyrical, narrative tone. Third person. Written to be read aloud or read quietly as devotion, not academic.
- Do not use markdown headers (#), bullet points, or bold/italic formatting. Plain prose paragraphs only, with blank lines between paragraphs is fine.
- Do not editorialize about "in this myth..." or "scholars believe..." — just tell the story as story.`;

function buildUserPrompt({ myth, part, partNumber, totalParts, isFirstPart, isLastPart }) {
  const beatsList = part.beats.map((b) => `- ${b}`).join("\n");
  const multiPart = totalParts > 1;

  let structureNote = "";
  if (multiPart && isFirstPart) {
    structureNote = `This is part 1 of ${totalParts} of this myth. End at a natural pause in the story — do not resolve everything. Do not write "to be continued" or similar meta text; just end the prose at a fitting moment.`;
  } else if (multiPart && isLastPart) {
    structureNote = `This is the final part (${partNumber} of ${totalParts}) of this myth. Open with a brief (one sentence) reminder of where the story left off, then continue and bring it to its close.`;
  } else if (multiPart) {
    structureNote = `This is part ${partNumber} of ${totalParts} of this myth. Open with a brief (one sentence) reminder of where the story left off, and end at a natural pause — do not resolve the whole myth here.`;
  } else {
    structureNote = "This myth is told in a single part. Tell it complete, beginning to end.";
  }

  return `Myth: ${myth.title}
Characters involved: ${myth.characters.join(", ")}
Background context (for your understanding only, do not restate this verbatim): ${myth.context}

${structureNote}

Here is the sequence of events to narrate for this part, in order:
${beatsList}

Write the retelling now. Start directly with the story prose${multiPart && !isFirstPart ? " (after your brief one-sentence recap)" : ""} — no title line, no preamble, no closing note. Stay under ${CHAR_LIMIT} characters total.`;
}

async function callClaude(messages, { maxTokens = 900 } = {}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set.");
  }
  const resp = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      max_tokens: maxTokens,
      system: SYSTEM_PROMPT,
      messages,
    }),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`Anthropic API error ${resp.status}: ${body}`);
  }

  const data = await resp.json();
  const text = (data.content || [])
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Anthropic API returned no text content.");
  }
  return text;
}

/**
 * Generate the retelling for one part of a myth, staying under CHAR_LIMIT.
 * Retries once with explicit "too long, shorten" feedback if the first
 * attempt overshoots; falls back to a safe sentence-boundary trim as a
 * last resort so a run never fails outright over a length overshoot.
 */
export async function generateMythPart(target) {
  const userPrompt = buildUserPrompt(target);
  const messages = [{ role: "user", content: userPrompt }];

  let text = await callClaude(messages);

  if (text.length > CHAR_LIMIT) {
    messages.push({ role: "assistant", content: text });
    messages.push({
      role: "user",
      content: `That was ${text.length} characters, which is over the ${CHAR_LIMIT} character limit. Rewrite it more concisely so the ENTIRE reply is under ${CHAR_LIMIT} characters, while still covering all the listed events. Reply with only the rewritten text.`,
    });
    text = await callClaude(messages);
  }

  if (text.length > CHAR_LIMIT) {
    text = safeTrim(text, CHAR_LIMIT);
  }

  return text;
}

function safeTrim(text, limit) {
  if (text.length <= limit) return text;
  const slice = text.slice(0, limit - 1);
  const lastBreak = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf(".\n"),
    slice.lastIndexOf("\n\n")
  );
  if (lastBreak > limit * 0.6) {
    return slice.slice(0, lastBreak + 1).trim();
  }
  return slice.trim() + "…";
}
