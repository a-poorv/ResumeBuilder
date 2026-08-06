import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { resumeController } from "../controllers/resumeController";

const router = Router();

// Configure Multer for in-memory upload buffering & sizing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
  fileFilter: (_req, file, cb) => {
    const isAccepted =
      file.mimetype === "application/pdf" ||
      file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    if (isAccepted) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PDF and DOCX files are allowed."));
    }
  },
});

const handleUpload = (req: Request, res: Response, next: NextFunction) => {
  upload.single("resume")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "File too large. Maximum size is 10 MB." });
      }
      return res.status(400).json({ error: err.message });
    }
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

router.post("/upload-resume", handleUpload, resumeController.uploadResume);
router.post("/analyze-jd", resumeController.analyzeJd);
router.post("/generate-resume", resumeController.generateResume);
router.get("/history", resumeController.getHistory);

export default router;
