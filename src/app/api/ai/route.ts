import Anthropic from "@anthropic-ai/sdk";
import type { BetaMessageParam, BetaOutputConfig } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import type { AIRequest, ContextDoc } from "@/lib/ai/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * AI gateway. The API key never leaves the server.
 * ─ Requires ANTHROPIC_API_KEY (see .env.example).
 * ─ Text tasks stream plain UTF-8; JSON tasks return application/json.
 */
const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";
const MAX_INPUT_CHARS = 120_000;

function configured() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

export async function GET() {
  return Response.json({ configured: configured(), model: MODEL });
}

const SYSTEM = `You are the intelligence layer of "Second Brain", a personal knowledge OS.
You help one person think with their own notes. Be precise, warm and concise.
Never invent facts about the user's notes; if the notes don't contain the answer, say so plainly.
Use GitHub-flavoured Markdown. Prefer short paragraphs and tight bullet lists.`;

function formatContext(docs: ContextDoc[]) {
  return docs
    .map((d, i) => `<note index="${i + 1}" kind="${d.kind}" title="${escapeAttr(d.title)}">\n${d.body.slice(0, 6000)}\n</note>`)
    .join("\n\n");
}

const escapeAttr = (s: string) => s.replace(/"/g, "'");

interface Plan {
  messages: BetaMessageParam[];
  system?: string;
  output: BetaOutputConfig;
  maxTokens: number;
  json: boolean;
}

function plan(req: AIRequest): Plan {
  switch (req.task) {
    case "summarize":
      return {
        json: false,
        maxTokens: 4000,
        output: { effort: "low" },
        messages: [
          {
            role: "user",
            content: `Summarise this page in 2–4 sentences, then list up to 4 key takeaways as bullets. No preamble.\n\n<page title="${escapeAttr(req.title)}">\n${req.content}\n</page>`,
          },
        ],
      };
    case "expand-idea":
      return {
        json: false,
        maxTokens: 8000,
        output: { effort: "medium" },
        messages: [
          {
            role: "user",
            content: `Expand this idea into something actionable. Sections: **Why it matters**, **How it could work** (3–5 bullets), **Risks & open questions**, **First small step**. Keep it under 250 words.${
              req.related?.length ? `\n\nRelated notes from my second brain for context:\n${formatContext(req.related)}` : ""
            }\n\n<idea title="${escapeAttr(req.title)}">\n${req.description || "(no description yet)"}\n</idea>`,
          },
        ],
      };
    case "categorize":
      return {
        json: true,
        maxTokens: 2000,
        output: {
          effort: "low",
          format: {
            type: "json_schema",
            schema: {
              type: "object",
              properties: {
                category: { type: "string", description: "Best fitting category" },
                tags: { type: "array", items: { type: "string" }, description: "2-5 short lowercase tags" },
              },
              required: ["category", "tags"],
              additionalProperties: false,
            },
          },
        },
        messages: [
          {
            role: "user",
            content: `Categorise this note. Prefer one of the existing categories: ${req.categories.join(", ") || "(none)"}. Only propose a new category if none fits. Prefer reusing existing tags where relevant: ${req.tags.slice(0, 80).join(", ") || "(none)"}.\n\n<note title="${escapeAttr(req.title)}">\n${req.content.slice(0, 20000)}\n</note>`,
          },
        ],
      };
    case "summarize-conversation":
      return {
        json: true,
        maxTokens: 4000,
        output: {
          effort: "low",
          format: {
            type: "json_schema",
            schema: {
              type: "object",
              properties: {
                title: { type: "string", description: "Short title, max 6 words" },
                summary: { type: "string", description: "2-3 sentence summary: decisions, conclusions, next steps" },
                category: { type: "string" },
              },
              required: ["title", "summary", "category"],
              additionalProperties: false,
            },
          },
        },
        messages: [
          {
            role: "user",
            content: `Summarise this conversation for my second brain. Category should preferably be one of: ${req.categories.join(", ")}.\n\n<conversation>\n${req.transcript}\n</conversation>`,
          },
        ],
      };
    case "ask": {
      const history = (req.history ?? []).slice(-8).map((m) => ({ role: m.role, content: m.content }) as BetaMessageParam);
      return {
        json: false,
        maxTokens: 16000,
        output: { effort: "medium" },
        system: `${SYSTEM}\nAnswer using the user's notes provided below. Cite notes inline as [n] using their index. If the notes are insufficient, say what is missing and suggest what to capture.\n\n<notes>\n${formatContext(req.context)}\n</notes>`,
        messages: [...history, { role: "user", content: req.question }],
      };
    }
  }
}

function validate(body: unknown): AIRequest {
  if (!body || typeof body !== "object" || !("task" in body)) throw new Error("Missing task");
  const size = JSON.stringify(body).length;
  if (size > MAX_INPUT_CHARS) throw new Error("Input is too large for a single request");
  const task = (body as { task: string }).task;
  if (!["summarize", "expand-idea", "categorize", "summarize-conversation", "ask"].includes(task)) throw new Error("Unknown task");
  return body as AIRequest;
}

export async function POST(request: Request) {
  if (!configured()) {
    return Response.json(
      { error: "AI is not configured. Add ANTHROPIC_API_KEY to .env.local and restart the server.", code: "not_configured" },
      { status: 503 },
    );
  }

  let req: AIRequest;
  try {
    req = validate(await request.json());
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Bad request" }, { status: 400 });
  }

  const client = new Anthropic();
  const p = plan(req);
  const params = {
    model: MODEL,
    max_tokens: p.maxTokens,
    system: p.system ?? SYSTEM,
    output_config: p.output,
    messages: p.messages,
    // If a safety classifier declines, the API retries on a fallback model.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default" as const,
  };

  try {
    if (p.json) {
      const msg = await client.beta.messages.create(params);
      if (msg.stop_reason === "refusal") return Response.json({ error: "The model declined this request." }, { status: 422 });
      const text = msg.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
      return Response.json({ result: JSON.parse(text) });
    }

    const stream = client.beta.messages.stream(params, { signal: request.signal });
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
          const final = await stream.finalMessage();
          if (final.stop_reason === "refusal") controller.enqueue(encoder.encode("\n\n_The model declined to answer this request._"));
          if (final.stop_reason === "max_tokens") controller.enqueue(encoder.encode("\n\n_…response truncated._"));
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
      cancel() {
        stream.abort();
      },
    });
    return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
  } catch (err) {
    return errorResponse(err);
  }
}

function errorResponse(err: unknown) {
  if (err instanceof Anthropic.AuthenticationError)
    return Response.json({ error: "The Anthropic API key was rejected. Check ANTHROPIC_API_KEY." }, { status: 401 });
  if (err instanceof Anthropic.RateLimitError)
    return Response.json({ error: "Rate limited by the AI provider. Try again in a moment." }, { status: 429 });
  if (err instanceof Anthropic.BadRequestError) return Response.json({ error: err.message }, { status: 400 });
  if (err instanceof Anthropic.APIError) return Response.json({ error: err.message }, { status: err.status ?? 502 });
  if (err instanceof SyntaxError) return Response.json({ error: "The AI returned malformed JSON." }, { status: 502 });
  return Response.json({ error: "Unexpected AI error." }, { status: 500 });
}
