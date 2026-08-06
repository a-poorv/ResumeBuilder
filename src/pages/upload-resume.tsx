import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, AlertCircle, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { PageShell } from "@/components/shared/page-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useFileUpload } from "@/hooks/use-file-upload";
import { FileDropZone } from "@/components/shared/file-drop-zone";
import { FileCard } from "@/components/shared/file-card";
import { uploadResume } from "@/lib/api";
import { useResumeSession } from "@/context/resume-session";

export function UploadResumePage() {
  const navigate = useNavigate();
  const { uploadedFile, originalResume, setUploadedFile, setOriginalResume } =
    useResumeSession();
  const {
    file,
    error,
    isDragOver,
    inputRef,
    handleInputChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    openFilePicker,
    removeFile,
  } = useFileUpload();

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => {
    setUploadSuccess(false);
    setUploadError(null);
  }, [file]);

  const handleRemove = () => {
    removeFile();
    setUploadedFile(null);
    setOriginalResume(null);
    setUploadSuccess(false);
    setUploadError(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      const result = await uploadResume(file);
      setUploadedFile({
        fileName: result.fileName,
        size: result.size,
        mimeType: result.mimeType,
      });
      if (result.parsedResume) {
        setOriginalResume(result.parsedResume);
      }
      setUploadSuccess(true);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const activeFileName = file?.name || uploadedFile?.fileName;
  const hasParsedResume = Boolean(originalResume);

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Upload your resume</CardTitle>
            <CardDescription>
              We’ll use this as your base — experience, skills, and timeline stay
              yours. Next, add a job description to tailor it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {(error || uploadError) && (
              <div className="flex items-start gap-3 rounded-xl border border-error-500/20 bg-error-500/5 p-4 text-sm text-error-500 animate-fade-in">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  {error ? (
                    <>
                      <p className="font-semibold">Couldn’t use {error.fileName}</p>
                      <p className="text-xs opacity-90">{error.message}</p>
                    </>
                  ) : (
                    <p className="font-semibold">{uploadError}</p>
                  )}
                </div>
              </div>
            )}

            {uploadSuccess && hasParsedResume && (
              <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-700 animate-fade-in">
                <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">You’re all set</p>
                  <p className="text-xs opacity-90">
                    We found <strong>{originalResume?.fullName}</strong>. Continue
                    to add the job you’re applying for.
                  </p>
                </div>
              </div>
            )}

            <FileDropZone
              isDragOver={isDragOver}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={openFilePicker}
              inputRef={inputRef}
              onChange={handleInputChange}
            />

            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wider text-surface-400">
                Selected file
              </p>
              {file || uploadedFile ? (
                <FileCard
                  fileName={activeFileName || "resume"}
                  fileSize={file?.size || uploadedFile?.size || 0}
                  onRemove={handleRemove}
                />
              ) : (
                <div className="flex items-center justify-center rounded-xl border border-dashed border-surface-200 bg-surface-50/50 p-8 text-center text-sm text-surface-400">
                  No file selected yet
                </div>
              )}
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              <Button onClick={handleUpload} disabled={!file || isUploading}>
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload resume
                  </>
                )}
              </Button>
              {hasParsedResume && (
                <Button
                  variant="secondary"
                  onClick={() => navigate("/job-description")}
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
