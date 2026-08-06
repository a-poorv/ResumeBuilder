import { TailoredResume } from "../types";
import { getSupabaseAdmin, isSupabaseConfigured } from "../lib/supabase";

const memoryHistory: TailoredResume[] = [];
const TABLE = "generation_history";

type HistoryRow = {
  id: string;
  client_id: string;
  target_role: string;
  match_score: number | null;
  source: string;
  tailored_content: TailoredResume["tailoredContent"];
  generated_at: string;
};

function rowToTailored(row: HistoryRow): TailoredResume {
  return {
    id: row.id,
    targetRole: row.target_role,
    matchScore: row.match_score,
    source: row.source === "mock" ? "mock" : "groq",
    tailoredContent: row.tailored_content,
    generatedAt: row.generated_at,
  };
}

function mergeById(
  primary: TailoredResume[],
  secondary: TailoredResume[]
): TailoredResume[] {
  const map = new Map<string, TailoredResume>();
  for (const item of [...primary, ...secondary]) {
    if (!map.has(item.id)) map.set(item.id, item);
  }
  return Array.from(map.values()).sort(
    (a, b) =>
      new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
  );
}

export class HistoryStore {
  isCloudEnabled(): boolean {
    return isSupabaseConfigured();
  }

  async save(entry: TailoredResume, clientId?: string): Promise<void> {
    memoryHistory.unshift(entry);
    if (memoryHistory.length > 100) memoryHistory.length = 100;

    const supabase = getSupabaseAdmin();
    if (!supabase) return;

    const safeClientId = (clientId || "anonymous").trim() || "anonymous";

    try {
      const { error } = await supabase.from(TABLE).upsert(
        {
          id: entry.id,
          client_id: safeClientId,
          target_role: entry.targetRole,
          match_score: entry.matchScore,
          source: entry.source,
          tailored_content: entry.tailoredContent,
          generated_at: entry.generatedAt,
        },
        { onConflict: "id" }
      );

      if (error) {
        console.warn("Supabase history save failed:", error.message);
      }
    } catch (error) {
      console.warn(
        "Supabase history save error:",
        error instanceof Error ? error.message : error
      );
    }
  }

  async list(clientId?: string): Promise<TailoredResume[]> {
    const supabase = getSupabaseAdmin();
    const memory = [...memoryHistory];

    if (!supabase) return memory;

    try {
      let query = supabase
        .from(TABLE)
        .select(
          "id, client_id, target_role, match_score, source, tailored_content, generated_at"
        )
        .order("generated_at", { ascending: false })
        .limit(50);

      const safeClientId = clientId?.trim();
      if (safeClientId) {
        query = query.eq("client_id", safeClientId);
      }

      const { data, error } = await query;
      if (error) {
        console.warn("Supabase history fetch failed:", error.message);
        return memory;
      }

      const remote = (data as HistoryRow[] | null)?.map(rowToTailored) ?? [];
      return mergeById(remote, memory);
    } catch (error) {
      console.warn(
        "Supabase history fetch error:",
        error instanceof Error ? error.message : error
      );
      return memory;
    }
  }
}

export const historyStore = new HistoryStore();
