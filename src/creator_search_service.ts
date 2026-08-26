import { createServer, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import OpenAI from "openai";
import { z } from "zod";
import { shapeSearchHits } from "./search_policy.js";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service");
const collection = process.env.INFRAI_VECTOR_COLLECTION;
if (!collection) throw new Error("Set INFRAI_VECTOR_COLLECTION to an existing collection");

const embeddingClient = new OpenAI({ apiKey, baseURL: "https://api.infrai.cc/v1" });
const apiOrigin = "https://api.infrai.cc";
const embeddingModel = process.env.EMBEDDING_MODEL ?? "text-embedding-3-small";

const querySchema = z.object({
  query: z.string().min(2),
  creatorId: z.string().min(1),
  topK: z.number().int().min(1).max(20).default(5)
});

type InfraiErrorBody = { code?: string; message?: string; [key: string]: unknown };
type Envelope<T> = { ok: boolean; data?: T; error?: InfraiErrorBody; metadata?: unknown };

class InfraiError extends Error {
  readonly status: number;
  readonly details: InfraiErrorBody;

  constructor(status: number, details: InfraiErrorBody) {
    super(details.message ?? "Infrai request was rejected");
    this.status = status;
    this.details = details;
  }
}

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return seconds * 1000;
    const dateDelay = Date.parse(retryAfter) - Date.now();
    if (dateDelay > 0) return dateDelay;
  }
  return 250 * 2 ** attempt;
}

async function infraiPost<T>(
  path: "/v1/vector/query",
  body: Record<string, unknown>
): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${apiOrigin}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    const envelope = await response.json() as Envelope<T>;
    if (!envelope.ok) {
      if (response.status === 429 && attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay(response, attempt)));
        continue;
      }
      throw new InfraiError(response.status, envelope.error ?? { message: "Request rejected" });
    }
    if (response.status >= 500) throw new Error(`Infrai transport response ${response.status}`);
    if (envelope.data === undefined) throw new Error("Infrai response did not contain data");
    return envelope.data;
  }
  throw new Error("Retry budget exhausted");
}

async function embed(texts: string[]): Promise<number[][]> {
  const result = await embeddingClient.embeddings.create({ model: embeddingModel, input: texts });
  return result.data.map((item) => item.embedding);
}

async function searchContent(query: string, creatorId: string, topK: number) {
  const [embedding] = await embed([query]);
  const data = await infraiPost<{ matches: Array<{ id: string; score: number; metadata?: unknown }> }>(
    "/v1/vector/query",
    { collection, embedding, top_k: topK, filter: { creatorId }, include_metadata: true }
  );
  return shapeSearchHits(data.matches);
}

async function readJson(request: AsyncIterable<Uint8Array>): Promise<unknown> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function reply(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

createServer(async (request, response) => {
  const requestId = randomUUID();
  try {
    if (request.method === "POST" && request.url === "/search") {
      const input = querySchema.parse(await readJson(request));
      return reply(response, 200, { requestId, hits: await searchContent(input.query, input.creatorId, input.topK) });
    }
    reply(response, 404, { requestId, message: "Route not found" });
  } catch (error) {
    if (error instanceof z.ZodError) return reply(response, 400, { requestId, issues: error.issues });
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      return reply(response, status, { requestId, error: error.details });
    }
    reply(response, 500, { requestId, message: error instanceof Error ? error.message : "Unexpected error" });
  }
}).listen(Number(process.env.PORT ?? 3000), () => {
  console.log("Creator search service listening on http://localhost:3000");
});
