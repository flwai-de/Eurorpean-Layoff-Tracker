// Telegram Bot Setup:
// 1. Öffne Telegram, suche @BotFather
// 2. Sende /newbot, wähle Name: "Dimissio Alerts" und Username: z.B. dimissio_alerts_bot
// 3. BotFather gibt dir den Token → setze als TELEGRAM_BOT_TOKEN in Coolify (Runtime!)
// 4. Sende dem Bot eine Nachricht (z.B. "hi")
// 5. Öffne https://api.telegram.org/bot<TOKEN>/getUpdates
// 6. Finde deine chat_id im JSON → setze als TELEGRAM_CHAT_ID in Coolify (Runtime!)

export async function sendTelegramAlert(message: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn(
      "[telegram] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing — skipping alert",
    );
    return false;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: false,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[telegram] sendMessage failed: ${res.status} ${body}`);
      return false;
    }
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[telegram] sendMessage error: ${message}`);
    return false;
  }
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function formatLayoffAlert(params: {
  tier: 1 | 2;
  articleTitle: string;
  matchedKeywords: string[];
  feedName: string;
  articleUrl: string;
}): string {
  const { tier, articleTitle, matchedKeywords, feedName, articleUrl } = params;
  return [
    `🔔 <b>Neuer Layoff-Hinweis</b> (Tier ${tier})`,
    "",
    `<b>${escapeHtml(articleTitle)}</b>`,
    "",
    `Keywords: ${escapeHtml(matchedKeywords.join(", "))}`,
    `Quelle: ${escapeHtml(feedName)}`,
    "",
    `<a href="${escapeHtml(articleUrl)}">Artikel lesen</a>`,
    `<a href="https://dimissio.eu/admin/layoffs/new">→ Im Admin eintragen</a>`,
  ].join("\n");
}
