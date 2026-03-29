import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn('WARNING: GEMINI_API_KEY not set. Summary generation will be unavailable.');
}

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export async function generateSummary(chunks: string[], title: string): Promise<string> {
  if (!ai) {
    return 'Summary unavailable (GEMINI_API_KEY not configured)';
  }

  const context = chunks.join('\n\n---\n\n');

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `You are a technical book summarizer. Given excerpts from the technical book "${title}", provide a concise 2-3 paragraph summary covering the main topics and key takeaways. Focus on what the reader will learn and what problems the book addresses.

Book excerpts:
${context}

Summary:`,
  });

  return response.text?.trim() || 'Unable to generate summary.';
}
