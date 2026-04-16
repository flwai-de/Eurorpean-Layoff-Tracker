import { getGemini } from "@/lib/api/gemini";

const SYSTEM_PROMPT = `You are a binary classifier for a European layoff tracker.

Given a news article title (and optional snippet), decide if it reports on ACTUAL job cuts, layoffs, mass redundancies, or plant/site closures at a company — with any European connection (European company OR European site of a non-European company).

Answer with exactly one word: "yes" or "no".

Answer "yes" if:
- The article reports real job cuts, layoffs, redundancies, restructuring with headcount reduction, plant closures
- There is or could be a European connection (European company, European site mentioned, global layoffs that likely affect Europe)

Answer "no" if:
- The article is about hiring, opinion pieces, analyst speculation, rumors
- The layoffs are explicitly limited to non-European regions (e.g. "US only", "only Asian operations")
- The article is about denied or avoided layoffs
- The article is about unrelated business topics (earnings, M&A without layoffs, stock moves)

Be liberal — when in doubt, answer "yes". A human editor reviews all "yes" results.`;

export interface ClassificationResult {
  isLayoff: boolean;
  reasoning?: string;
}

export async function classifyArticle(
  title: string,
  snippet?: string,
): Promise<ClassificationResult> {
  const gemini = getGemini();

  const input = snippet
    ? `Title: ${title}\n\nSnippet: ${snippet.slice(0, 500)}`
    : `Title: ${title}`;

  const response = await gemini.models.generateContent({
    model: "gemini-2.5-flash-lite",
    contents: [
      {
        role: "user",
        parts: [{ text: input }],
      },
    ],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      maxOutputTokens: 10,
      temperature: 0,
    },
  });

  const text = response.text?.trim().toLowerCase() ?? "";
  return {
    isLayoff: text.startsWith("yes"),
  };
}
