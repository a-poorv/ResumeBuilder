import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import resumeRoutes from "./routes/resumeRoutes";

const app = express();
const PORT = process.env.PORT || 3000;

/** Comma-separated allowed origins, e.g. https://app.vercel.app,http://localhost:5173 */
function allowedOrigins(): string[] {
  const raw = process.env.FRONTEND_ORIGIN?.trim();
  if (!raw) {
    return ["http://localhost:5173", "http://127.0.0.1:5173"];
  }
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const origins = allowedOrigins();

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser clients (no Origin) and local/dev tooling.
      if (!origin) {
        callback(null, true);
        return;
      }
      if (
        origins.includes(origin) ||
        origins.includes("*") ||
        /\.vercel\.app$/i.test(origin)
      ) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date(),
    groqConfigured: Boolean(process.env.GROQ_API_KEY),
    supabaseConfigured: Boolean(
      process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ),
  });
});

app.use(resumeRoutes);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Global Error Handler Log:", err.message);

  if (err.message.startsWith("CORS blocked")) {
    return res.status(403).json({ error: err.message });
  }

  const status =
    err.message.includes("GROQ_API_KEY") || err.message.includes("Groq")
      ? 502
      : 500;

  res.status(status).json({
    error: err.message || "An unexpected error occurred on the server.",
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`CORS origins: ${origins.join(", ")}`);
  if (!process.env.GROQ_API_KEY) {
    console.warn(
      "Warning: GROQ_API_KEY is not set. AI parse/generate will fail until configured."
    );
  } else {
    console.log(`Groq model: ${process.env.GROQ_MODEL || "llama-3.3-70b-versatile"}`);
  }
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log("Supabase history: enabled");
  } else {
    console.log(
      "Supabase history: disabled (optional). App uses memory + browser localStorage."
    );
  }
});
