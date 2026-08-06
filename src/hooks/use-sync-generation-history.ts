import { useEffect } from "react";
import { fetchGenerationHistory } from "@/lib/api";
import { useResumeSession } from "@/context/resume-session";

/** Soft-sync cloud/server history into local session. Failures are ignored. */
export function useSyncGenerationHistory() {
  const { mergeGenerationHistory } = useResumeSession();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const remote = await fetchGenerationHistory();
        if (!cancelled && remote.length > 0) {
          mergeGenerationHistory(remote);
        }
      } catch {
        // Offline / no Supabase / server memory empty — local history still works.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mergeGenerationHistory]);
}
