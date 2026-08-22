export type RagSource = {
  id: string;
  rank: number;
  score: number;
  text: string;
  language: string | null;
  strategy: string | null;
  query_id: number | null;
};

export type RagResponse = {
  request_id: string;
  status: "answered" | "refused";
  answer: string;
  grounded: boolean;
  grounding_score: number;
  language: string | null;
  sources: RagSource[];
  latency: {
    input_guard_ms: number;
    retrieval_ms: number;
    generation_ms: number;
    output_guard_ms: number;
    total_ms: number;
  };
  refusal_reason: string | null;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export async function askRag(query: string, language?: string): Promise<RagResponse> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(`${API_BASE}/v1/rag/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        language: language || null,
        split: "validation",
        limit: 5,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.detail || `RAG request failed (${response.status})`);
    }
    return (await response.json()) as RagResponse;
  } finally {
    window.clearTimeout(timeout);
  }
}
