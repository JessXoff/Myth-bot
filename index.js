import { readFile } from "node:fs/promises";
import { loadState, saveState, isDueToPost, getCurrentTarget, advance } from "./src/state.js";
import { generateMythPart } from "./src/generateText.js";
import { postToDiscord } from "./src/discord.js";

const DRY_RUN = process.env.DRY_RUN === "true";
const FORCE = process.env.FORCE_POST === "true";

async function loadMyths() {
  const raw = await readFile(new URL("./myths.json", import.meta.url), "utf8");
  return JSON.parse(raw);
}

function buildTitle({ myth, partNumber, totalParts }) {
  return totalParts > 1 ? `${myth.title} — Part ${partNumber} of ${totalParts}` : myth.title;
}

const FOOTER =
  "Retold from the Sumerian/Akkadian myth cycle of Inanna — informed by Diane Wolkstein & Samuel Noah Kramer's “Inanna: Queen of Heaven and Earth,” the Electronic Text Corpus of Sumerian Literature, and general scholarship. Original narration, not a quotation.";

async function main() {
  const myths = await loadMyths();
  const state = await loadState();

  if (!FORCE && !isDueToPost(state)) {
    console.log(
      `Not due yet. Last posted ${state.lastPostedAt}. Set FORCE_POST=true to override.`
    );
    return;
  }

  const target = getCurrentTarget(myths, state);
  console.log(
    `Posting "${target.myth.title}" part ${target.partNumber}/${target.totalParts} (myth ${state.mythIndex}, cycle ${state.cycleCount || 0})`
  );

  const text = await generateMythPart(target);
  console.log(`Generated ${text.length} characters.`);

  const title = buildTitle(target);

  if (DRY_RUN) {
    console.log("--- DRY RUN: would post ---");
    console.log(`# ${title}\n`);
    console.log(text);
    console.log(`\n(footer: ${FOOTER})`);
    console.log("--- end dry run (state not advanced, not posted) ---");
    return;
  }

  await postToDiscord({ title, description: text, footer: FOOTER });

  const nextState = advance(myths, state);
  await saveState(nextState);
  console.log(
    `Posted and advanced state -> myth ${nextState.mythIndex}, part ${nextState.partIndex}, cycle ${nextState.cycleCount}.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
