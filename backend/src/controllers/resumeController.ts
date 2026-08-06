import { Request, Response, NextFunction } from "express";
import { resumeService, validateGenerateResumeRequest } from "../services/resumeService";

function parseHighlightSkills(value: unknown): string[] | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) {
    return value.map(String).map((s) => s.trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return undefined;
}

function readClientId(req: Request): string | undefined {
  const header = req.header("x-client-id");
  if (header && header.trim()) return header.trim().slice(0, 80);
  const bodyId =
    req.body && typeof req.body === "object"
      ? (req.body as { clientId?: unknown }).clientId
      : undefined;
  if (typeof bodyId === "string" && bodyId.trim()) {
    return bodyId.trim().slice(0, 80);
  }
  const queryId = req.query.clientId;
  if (typeof queryId === "string" && queryId.trim()) {
    return queryId.trim().slice(0, 80);
  }
  return undefined;
}

export class ResumeController {
  uploadResume = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded. Please upload a PDF or DOCX file." });
      }
      const data = await resumeService.processResumeUpload(req.file);
      return res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  };

  analyzeJd = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { jobDescription, highlightSkills } = req.body;
      if (!jobDescription || typeof jobDescription !== "string") {
        return res.status(400).json({
          error: "jobDescription is a required parameter and must be a string.",
        });
      }

      const analysis = await resumeService.analyzeJobDescription(
        jobDescription,
        parseHighlightSkills(highlightSkills)
      );
      return res.status(200).json(analysis);
    } catch (error) {
      next(error);
    }
  };

  generateResume = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = validateGenerateResumeRequest(req.body);
      if (!validated.ok) {
        return res.status(400).json({ error: validated.error });
      }

      const tailored = await resumeService.generateTailoredResume(
        validated.value,
        readClientId(req)
      );
      return res.status(200).json(tailored);
    } catch (error) {
      next(error);
    }
  };

  getHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const history = await resumeService.getHistory(readClientId(req));
      return res.status(200).json(history);
    } catch (error) {
      next(error);
    }
  };
}

export const resumeController = new ResumeController();
