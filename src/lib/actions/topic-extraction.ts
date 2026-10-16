"use server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function generateWithRetry(
  prompt: string,
  maxAttempts: number = 3
): Promise<string> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });
      return response.text ?? "[]";
    } catch (err: any) {
      lastError = err;
      const isRetryable = err?.status === 503 || err?.status === 429;
      if (!isRetryable || attempt === maxAttempts) throw err;

      const delay = 1000 * 2 ** (attempt - 1); // 1s, 2s, 4s
      console.log(`Retrying after ${delay}ms (attempt ${attempt}/${maxAttempts})...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

export async function extractTopicsFromAbstract(
  abstract: string | null,
  title: string
): Promise<string[]> {
  const isTitleOnly = !abstract;
  const textToAnalyze = abstract ?? title;

  const prompt = isTitleOnly
    ? `Given only this paper title (no abstract available), infer 2-3 short category labels (2-4 words each, Title Case, like "Cryptography and Data Security") representing its subject area. Return ONLY a JSON array of strings.\n\nTitle: ${title}`
    : `Given this abstract, return 2-4 short category labels (2-4 words each, Title Case, like "Cryptography and Data Security" or "Privacy-Preserving Technologies in Data") representing the paper's core subject areas. Be specific and precise — avoid generic labels. Return ONLY a JSON array of strings.\n\nAbstract: ${textToAnalyze}`;

  try {
    const text = await generateWithRetry(prompt);
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Topic extraction failed after retries:", err);
    return [];
  }
}