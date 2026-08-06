import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  ParsedJobDescription,
  ParsedResume,
  PreviewDecision,
  TailoredResume,
  UserInstructions,
} from "@/types/resume";

const STORAGE_KEY = "resumebuilder.user-session";

interface UploadedFileMeta {
  fileName: string;
  size: number;
  mimeType: string;
}

interface ResumeSessionState {
  uploadedFile: UploadedFileMeta | null;
  originalResume: ParsedResume | null;
  jobDescriptionText: string;
  parsedJd: ParsedJobDescription | null;
  instructions: UserInstructions;
  tailoredResume: TailoredResume | null;
  /** Past generations for dashboard/history widgets (browser-local). */
  generationHistory: TailoredResume[];
  decision: PreviewDecision;
}

interface ResumeSessionContextValue extends ResumeSessionState {
  setUploadedFile: (file: UploadedFileMeta | null) => void;
  setOriginalResume: (resume: ParsedResume | null) => void;
  setJobDescriptionText: (text: string) => void;
  setParsedJd: (jd: ParsedJobDescription | null) => void;
  setInstructions: (instructions: UserInstructions) => void;
  setTailoredResume: (resume: TailoredResume | null) => void;
  setDecision: (decision: PreviewDecision) => void;
  clearTailored: () => void;
  resetSession: () => void;
  /** Merge remote/server history into local history without wiping session work. */
  mergeGenerationHistory: (remote: TailoredResume[]) => void;
}

const defaultInstructions: UserInstructions = {
  resumeLength: "auto",
};

const MAX_HISTORY = 30;

const defaultState: ResumeSessionState = {
  uploadedFile: null,
  originalResume: null,
  jobDescriptionText: "",
  parsedJd: null,
  instructions: defaultInstructions,
  tailoredResume: null,
  generationHistory: [],
  decision: "pending",
};

function normalizeHistory(value: unknown): TailoredResume[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is TailoredResume =>
      Boolean(item) &&
      typeof item === "object" &&
      typeof (item as TailoredResume).id === "string" &&
      typeof (item as TailoredResume).generatedAt === "string"
  );
}

function prependHistory(
  history: TailoredResume[],
  entry: TailoredResume
): TailoredResume[] {
  const withoutDup = history.filter((item) => item.id !== entry.id);
  return [entry, ...withoutDup].slice(0, MAX_HISTORY);
}

function loadState(): ResumeSessionState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as Partial<ResumeSessionState>;
    let generationHistory = normalizeHistory(parsed.generationHistory);
    // Seed from current tailored resume if history was never tracked before.
    if (
      generationHistory.length === 0 &&
      parsed.tailoredResume &&
      typeof parsed.tailoredResume.id === "string"
    ) {
      generationHistory = [parsed.tailoredResume];
    }

    return {
      ...defaultState,
      ...parsed,
      instructions: {
        ...defaultInstructions,
        ...(parsed.instructions ?? {}),
      },
      generationHistory,
    };
  } catch {
    return defaultState;
  }
}

function persist(state: ResumeSessionState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const ResumeSessionContext = createContext<ResumeSessionContextValue | null>(
  null
);

export function ResumeSessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ResumeSessionState>(() => loadState());

  const update = useCallback(
    (patch: Partial<ResumeSessionState>) => {
      setState((prev) => {
        const next = { ...prev, ...patch };
        persist(next);
        return next;
      });
    },
    []
  );

  const setUploadedFile = useCallback(
    (uploadedFile: UploadedFileMeta | null) => update({ uploadedFile }),
    [update]
  );

  const setOriginalResume = useCallback(
    (originalResume: ParsedResume | null) =>
      update({
        originalResume,
        tailoredResume: null,
        decision: "pending",
      }),
    [update]
  );

  const setJobDescriptionText = useCallback(
    (jobDescriptionText: string) => {
      setState((prev) => {
        if (prev.jobDescriptionText === jobDescriptionText) return prev;
        const next = { ...prev, jobDescriptionText };
        persist(next);
        return next;
      });
    },
    []
  );

  const setParsedJd = useCallback(
    (parsedJd: ParsedJobDescription | null) =>
      update({
        parsedJd,
        tailoredResume: null,
        decision: "pending",
      }),
    [update]
  );

  const setInstructions = useCallback(
    (instructions: UserInstructions) => update({ instructions }),
    [update]
  );

  const setTailoredResume = useCallback(
    (tailoredResume: TailoredResume | null) => {
      setState((prev) => {
        const next: ResumeSessionState = {
          ...prev,
          tailoredResume,
          decision: "pending",
          generationHistory: tailoredResume
            ? prependHistory(prev.generationHistory, tailoredResume)
            : prev.generationHistory,
        };
        persist(next);
        return next;
      });
    },
    []
  );

  const setDecision = useCallback(
    (decision: PreviewDecision) => update({ decision }),
    [update]
  );

  const clearTailored = useCallback(
    () =>
      update({
        tailoredResume: null,
        decision: "pending",
      }),
    [update]
  );

  const mergeGenerationHistory = useCallback((remote: TailoredResume[]) => {
    const normalized = normalizeHistory(remote);
    if (normalized.length === 0) return;

    setState((prev) => {
      const map = new Map<string, TailoredResume>();
      for (const item of [...normalized, ...prev.generationHistory]) {
        if (!map.has(item.id)) map.set(item.id, item);
      }
      const generationHistory = Array.from(map.values())
        .sort(
          (a, b) =>
            new Date(b.generatedAt).getTime() -
            new Date(a.generatedAt).getTime()
        )
        .slice(0, MAX_HISTORY);

      const next = { ...prev, generationHistory };
      persist(next);
      return next;
    });
  }, []);

  const resetSession = useCallback(() => {
    persist(defaultState);
    setState(defaultState);
  }, []);

  const value = useMemo<ResumeSessionContextValue>(
    () => ({
      ...state,
      setUploadedFile,
      setOriginalResume,
      setJobDescriptionText,
      setParsedJd,
      setInstructions,
      setTailoredResume,
      setDecision,
      clearTailored,
      resetSession,
      mergeGenerationHistory,
    }),
    [
      state,
      setUploadedFile,
      setOriginalResume,
      setJobDescriptionText,
      setParsedJd,
      setInstructions,
      setTailoredResume,
      setDecision,
      clearTailored,
      resetSession,
      mergeGenerationHistory,
    ]
  );

  return (
    <ResumeSessionContext.Provider value={value}>
      {children}
    </ResumeSessionContext.Provider>
  );
}

export function useResumeSession() {
  const context = useContext(ResumeSessionContext);
  if (!context) {
    throw new Error("useResumeSession must be used within ResumeSessionProvider");
  }
  return context;
}
