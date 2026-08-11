/**
 * AI Service Layer
 * Handles all AI-powered snippet operations: generation, explanation, conversion
 * Uses the backend's built-in LLM (no API keys needed)
 */

import type { Snippet } from "@/lib/types";

export interface AIPersonality {
  tone: "formal" | "sarcastic" | "mixed"; // mixed = default combo
  style: "technical" | "beginner-friendly" | "humorous";
  customInstructions?: string;
}

export interface GenerateSnippetRequest {
  prompt: string;
  language?: string;
  personality?: AIPersonality;
}

export interface GenerateSnippetResponse {
  code: string;
  language: string;
  explanation: string;
  tags: string[];
}

export interface ExplainSnippetRequest {
  code: string;
  language: string;
  personality?: AIPersonality;
}

export interface ExplainSnippetResponse {
  explanation: string;
  keyPoints: string[];
  complexity: "beginner" | "intermediate" | "advanced";
}

export interface ConvertSnippetRequest {
  code: string;
  fromLanguage: string;
  toLanguage: string;
  personality?: AIPersonality;
}

export interface ConvertSnippetResponse {
  code: string;
  notes: string;
  warnings?: string[];
}

/**
 * Build system prompt based on personality settings
 */
function buildSystemPrompt(personality?: AIPersonality): string {
  const defaultPersonality: AIPersonality = {
    tone: "mixed",
    style: "technical",
  };

  const config = personality || defaultPersonality;

  let systemPrompt = "You are an expert code assistant. ";

  // Tone
  if (config.tone === "formal") {
    systemPrompt += "Provide clear, professional, and precise responses. ";
  } else if (config.tone === "sarcastic") {
    systemPrompt +=
      "Be witty, sarcastic, and brutally honest. Don't sugarcoat things. Use dark humor when appropriate. ";
  } else {
    // mixed
    systemPrompt +=
      "Be professional but with a touch of personality. Use clarity and occasional wit. ";
  }

  // Style
  if (config.style === "beginner-friendly") {
    systemPrompt +=
      "Explain concepts in simple terms. Avoid jargon. Include helpful comments in code. ";
  } else if (config.style === "humorous") {
    systemPrompt +=
      "Make explanations entertaining. Use humor and relatable examples. ";
  } else {
    // technical
    systemPrompt +=
      "Assume the reader has coding experience. Focus on efficiency and best practices. ";
  }

  // Custom instructions
  if (config.customInstructions) {
    systemPrompt += `\n\nCustom instructions: ${config.customInstructions}`;
  }

  return systemPrompt;
}

/**
 * Call AI endpoint via fetch (since tRPC hooks don't work in service layer)
 */
async function callAIEndpoint(
  endpoint: "generate" | "explain" | "convert" | "generateRelated",
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>
): Promise<string> {
  try {
    const response = await fetch("/api/trpc/ai." + endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        messages,
      }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const serverMessage = data?.error?.json?.message || data?.error?.message;
      if (response.status === 429) {
        throw new Error(serverMessage || "AI quota reached. Please wait until the displayed reset time and try again.");
      }
      throw new Error(serverMessage || `AI API error: ${response.statusText}`);
    }

    // tRPC returns { result: { data: ... } }
    return data.result?.data || "";
  } catch (error) {
    console.error(`Error calling AI endpoint ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Generate a snippet from a natural language prompt
 */
export async function generateSnippet(
  request: GenerateSnippetRequest
): Promise<GenerateSnippetResponse> {
  const systemPrompt = buildSystemPrompt(request.personality);

  const userPrompt = `Generate a code snippet for: "${request.prompt}"${
    request.language ? ` in ${request.language}` : ""
  }

Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
{
  "code": "the actual code here",
  "language": "the programming language",
  "explanation": "brief explanation of what this does",
  "tags": ["tag1", "tag2"]
}`;

  try {
    const response = await callAIEndpoint("generate", [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    // Parse the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid response format from AI");
    }

    const result = JSON.parse(jsonMatch[0]);
    return {
      code: result.code || "",
      language: result.language || "Unknown",
      explanation: result.explanation || "",
      tags: result.tags || [],
    };
  } catch (error) {
    console.error("Error generating snippet:", error);
    throw error;
  }
}

/**
 * Explain an existing snippet
 */
export async function explainSnippet(
  request: ExplainSnippetRequest
): Promise<ExplainSnippetResponse> {
  const systemPrompt = buildSystemPrompt(request.personality);

  const userPrompt = `Explain this ${request.language} code:

\`\`\`${request.language}
${request.code}
\`\`\`

Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
{
  "explanation": "comprehensive explanation of what this code does",
  "keyPoints": ["point1", "point2", "point3"],
  "complexity": "beginner|intermediate|advanced"
}`;

  try {
    const response = await callAIEndpoint("explain", [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid response format from AI");
    }

    const result = JSON.parse(jsonMatch[0]);
    return {
      explanation: result.explanation || "",
      keyPoints: result.keyPoints || [],
      complexity: result.complexity || "intermediate",
    };
  } catch (error) {
    console.error("Error explaining snippet:", error);
    throw error;
  }
}

/**
 * Convert a snippet from one language to another
 */
export async function convertSnippet(
  request: ConvertSnippetRequest
): Promise<ConvertSnippetResponse> {
  const systemPrompt = buildSystemPrompt(request.personality);

  const userPrompt = `Convert this ${request.fromLanguage} code to ${request.toLanguage}:

\`\`\`${request.fromLanguage}
${request.code}
\`\`\`

Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
{
  "code": "the converted code",
  "notes": "explanation of any changes or idioms used in the target language",
  "warnings": ["warning1", "warning2"] or null if no warnings
}`;

  try {
    const response = await callAIEndpoint("convert", [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid response format from AI");
    }

    const result = JSON.parse(jsonMatch[0]);
    return {
      code: result.code || "",
      notes: result.notes || "",
      warnings: result.warnings || undefined,
    };
  } catch (error) {
    console.error("Error converting snippet:", error);
    throw error;
  }
}

/**
 * Generate related snippets based on a given snippet
 */
export async function generateRelatedSnippets(
  snippet: Snippet,
  personality?: AIPersonality
): Promise<GenerateSnippetResponse[]> {
  const systemPrompt = buildSystemPrompt(personality);

  const userPrompt = `Based on this ${snippet.language} snippet, generate 2 related variations:

\`\`\`${snippet.language}
${snippet.code}
\`\`\`

Title: ${snippet.title}
Description: ${snippet.description}

Return ONLY valid JSON array (no markdown) with this exact structure:
[
  {
    "code": "variation 1 code",
    "language": "${snippet.language}",
    "explanation": "why this variation is useful",
    "tags": ["tag1", "tag2"]
  },
  {
    "code": "variation 2 code",
    "language": "${snippet.language}",
    "explanation": "why this variation is useful",
    "tags": ["tag1", "tag2"]
  }
]`;

  try {
    const response = await callAIEndpoint("generateRelated", [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Invalid response format from AI");
    }

    const results = JSON.parse(jsonMatch[0]);
    return Array.isArray(results) ? results : [];
  } catch (error) {
    console.error("Error generating related snippets:", error);
    throw error;
  }
}
