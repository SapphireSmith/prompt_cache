import { createHash } from "crypto";

export function normalizePrompt(prompt: string): string {
  return prompt
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.!?,;:]+$/g, "");
}

export function hashPrompt(prompt: string): string {
  return createHash("sha256").update(prompt).digest("hex");
}

export function normalizeAndHashPrompt(prompt: string): {
  normalizedPrompt: string;
  promptHash: string;
} {
  const normalizedPrompt = normalizePrompt(prompt);

  return {
    normalizedPrompt,
    promptHash: hashPrompt(normalizedPrompt)
  };
}
