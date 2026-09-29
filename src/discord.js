const EMBED_COLOR = Number(process.env.EMBED_COLOR_HEX || "0xD4AF37"); // gold

/**
 * Post one embed to the configured Discord webhook.
 * Discord webhooks accept an embed description up to 4096 chars, but we
 * pass in text already capped to the project's stricter 1800-char rule.
 */
export async function postToDiscord({ title, description, footer }) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error("DISCORD_WEBHOOK_URL is not set.");
  }

  const payload = {
    embeds: [
      {
        title,
        description,
        color: EMBED_COLOR,
        footer: footer ? { text: footer } : undefined,
      },
    ],
  };

  const resp = await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`Discord webhook error ${resp.status}: ${body}`);
  }
}
