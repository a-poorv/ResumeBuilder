import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { ResumeSessionProvider } from "@/context/resume-session";

export default function App() {
  return (
    <ResumeSessionProvider>
      <RouterProvider router={router} />
    </ResumeSessionProvider>
  );
}
