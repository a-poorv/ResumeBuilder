import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "@/components/layout/app-layout";
import { DashboardPage } from "@/pages/dashboard";
import { UploadResumePage } from "@/pages/upload-resume";
import { JobDescriptionPage } from "@/pages/job-description";
import { AnalysisPage } from "@/pages/analysis";
import { GeneratorPage } from "@/pages/generator";
import { HistoryPage } from "@/pages/history";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "upload", element: <UploadResumePage /> },
      { path: "job-description", element: <JobDescriptionPage /> },
      { path: "analysis", element: <AnalysisPage /> },
      { path: "generator", element: <GeneratorPage /> },
      { path: "history", element: <HistoryPage /> },
    ],
  },
]);
