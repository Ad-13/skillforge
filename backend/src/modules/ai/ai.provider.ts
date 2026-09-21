import OpenAI from "openai";
import { z } from "zod";
import { env } from "../../config/env.ts";
import { UpstreamError } from "../../lib/errors.ts";

const extractJson = (text: string): string => {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  return start !== -1 && end > start ? cleaned.slice(start, end + 1) : cleaned;
};

export interface CompletionInput {
  system: string;
  user: string;
  model?: string;
}

const client = new OpenAI({
  baseURL: env.AI_BASE_URL,
  apiKey: env.AI_API_KEY,
  maxRetries: 2,
  timeout: 90_000,
});

export const aiProvider = {
  modelId(override?: string): string {
    return override ?? env.AI_MODEL;
  },

  async complete(input: CompletionInput): Promise<string> {
    const response = await client.chat.completions.create({
      model: this.modelId(input.model),
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: input.user },
      ],
    });

    const text = response.choices[0]?.message.content;
    if (!text) throw new UpstreamError("The model returned an empty response");
    return text;
  },

  async completeStructured<T>(
    schema: z.ZodType<T>,
    schemaName: string,
    input: CompletionInput,
  ): Promise<T> {
    const jsonSchema = JSON.stringify(z.toJSONSchema(schema));

    const system = [
      input.system,
      "",
      `CRITICAL OUTPUT FORMAT: respond with ONLY one valid JSON object conforming to this JSON Schema ("${schemaName}").`,
      "No markdown, no code fences, no explanation before or after the JSON.",
      jsonSchema,
    ].join("\n");

    let raw: string | null | undefined;

    try {
      const response = await client.chat.completions.create({
        model: this.modelId(input.model),
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: input.user },
        ],
      });

      raw = response.choices[0]?.message.content;
    } catch (error) {
      throw new UpstreamError(
        `The AI provider could not be reached: ${error instanceof Error ? error.message : "unknown"}`,
      );
    }

    if (!raw) throw new UpstreamError("The model returned an empty response");

    let candidate: unknown;
    try {
      candidate = JSON.parse(extractJson(raw));
    } catch {
      throw new UpstreamError("The model returned something that is not JSON");
    }

    const parsed = schema.safeParse(candidate);

    if (!parsed.success) {
      throw new UpstreamError(
        "The model did not produce output matching the expected shape",
        parsed.error.issues,
      );
    }

    return parsed.data;
  },
};
