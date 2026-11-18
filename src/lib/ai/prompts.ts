/** Shared request/response contracts between the AI route and the client. */

export type AITask = "summarize" | "expand-idea" | "categorize" | "summarize-conversation" | "ask";

export interface ContextDoc {
  id: string;
  kind: string;
  title: string;
  body: string;
}

export type AIRequest =
  | { task: "summarize"; title: string; content: string }
  | { task: "expand-idea"; title: string; description: string; related?: ContextDoc[] }
  | { task: "categorize"; title: string; content: string; categories: string[]; tags: string[] }
  | { task: "summarize-conversation"; transcript: string; categories: string[] }
  | { task: "ask"; question: string; context: ContextDoc[]; history?: Array<{ role: "user" | "assistant"; content: string }> };

export interface CategorizeResult {
  category: string;
  tags: string[];
}

export interface ConversationSummaryResult {
  title: string;
  summary: string;
  category: string;
}

export const JSON_TASKS: AITask[] = ["categorize", "summarize-conversation"];
