import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { ResumePreviewData } from "@/types/resume";
import { formatJobHeading } from "@/types/resume";

interface ResumeDocumentProps {
  resume: ResumePreviewData;
  compareWith?: ResumePreviewData;
  highlightChanges?: boolean;
  className?: string;
}

function Line({
  children,
  changed = false,
  highlightChanges = false,
  className,
}: {
  children: ReactNode;
  changed?: boolean;
  highlightChanges?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "transition-colors",
        highlightChanges &&
          changed &&
          "border-l-2 border-amber-400 bg-amber-50/40 pl-2",
        className
      )}
    >
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <p className="border-b border-surface-200 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-surface-500">
      {children}
    </p>
  );
}

export function ResumeDocument({
  resume,
  compareWith,
  highlightChanges = false,
  className,
}: ResumeDocumentProps) {
  const isChanged = (left: string, right?: string) =>
    highlightChanges && compareWith != null && left !== (right ?? "");

  const skillsChanged =
    highlightChanges &&
    compareWith != null &&
    resume.skills.join("|") !== compareWith.skills.join("|");

  const contact = [resume.email, resume.phone, resume.location, ...resume.links]
    .filter(Boolean)
    .join(" · ");

  const compareContact = compareWith
    ? [
        compareWith.email,
        compareWith.phone,
        compareWith.location,
        ...compareWith.links,
      ]
        .filter(Boolean)
        .join(" · ")
    : undefined;

  return (
    <article
      className={cn(
        "rounded-xl border border-surface-200 bg-white p-6 shadow-sm sm:p-8",
        className
      )}
    >
      <header className="space-y-1 pb-4">
        <Line
          highlightChanges={highlightChanges}
          changed={isChanged(resume.fullName, compareWith?.fullName)}
        >
          <h3 className="text-xl font-bold uppercase tracking-tight text-surface-900">
            {resume.fullName}
          </h3>
        </Line>
        {resume.title && (
          <Line
            highlightChanges={highlightChanges}
            changed={isChanged(resume.title, compareWith?.title)}
          >
            <p className="text-sm font-semibold uppercase text-surface-700">
              {resume.title}
            </p>
          </Line>
        )}
        {contact && (
          <Line
            highlightChanges={highlightChanges}
            changed={isChanged(contact, compareContact)}
          >
            <p className="text-xs text-surface-500">{contact}</p>
          </Line>
        )}
      </header>

      {resume.summary && (
        <section className="mt-5 space-y-2">
          <SectionTitle>Summary</SectionTitle>
          <Line
            highlightChanges={highlightChanges}
            changed={isChanged(resume.summary, compareWith?.summary)}
          >
            <p className="text-sm leading-relaxed text-surface-700">
              {resume.summary}
            </p>
          </Line>
        </section>
      )}

      {resume.skills.length > 0 && (
        <section className="mt-5 space-y-2">
          <SectionTitle>Skills</SectionTitle>
          <Line highlightChanges={highlightChanges} changed={skillsChanged}>
            <p className="text-sm leading-relaxed text-surface-700">
              {resume.skills.join(" · ")}
            </p>
          </Line>
        </section>
      )}

      {resume.experience.length > 0 && (
        <section className="mt-5 space-y-4">
          <SectionTitle>Experience</SectionTitle>
          {resume.experience.map((job, jobIndex) => {
            const compareJob = compareWith?.experience[jobIndex];
            const heading = formatJobHeading(job);
            const compareHeading = compareJob
              ? formatJobHeading(compareJob)
              : undefined;

            return (
              <div
                key={`${heading}-${job.duration}-${jobIndex}`}
                className="space-y-1"
              >
                <Line
                  highlightChanges={highlightChanges}
                  changed={isChanged(heading, compareHeading)}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-surface-900">
                      {heading}
                    </p>
                    {job.duration && (
                      <p className="text-xs text-surface-400">{job.duration}</p>
                    )}
                  </div>
                </Line>
                {job.subtitle && (
                  <Line
                    highlightChanges={highlightChanges}
                    changed={isChanged(job.subtitle, compareJob?.subtitle)}
                  >
                    <p className="text-xs italic text-surface-500">
                      {job.subtitle}
                    </p>
                  </Line>
                )}
                <ul className="space-y-1 pt-1">
                  {job.highlights.map((highlight, highlightIndex) => {
                    const compareHighlight =
                      compareJob?.highlights[highlightIndex];
                    return (
                      <li key={`${jobIndex}-${highlightIndex}`}>
                        <Line
                          highlightChanges={highlightChanges}
                          changed={isChanged(highlight, compareHighlight)}
                          className="flex gap-2"
                        >
                          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-surface-400" />
                          <span className="text-sm leading-relaxed text-surface-700">
                            {highlight}
                          </span>
                        </Line>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </section>
      )}

      {resume.education.length > 0 && (
        <section className="mt-5 space-y-2">
          <SectionTitle>Education</SectionTitle>
          {resume.education.map((edu, index) => {
            const compareEdu = compareWith?.education[index];
            return (
              <div key={`${edu.institution}-${edu.degree}-${index}`}>
                <Line
                  highlightChanges={highlightChanges}
                  changed={
                    isChanged(edu.degree, compareEdu?.degree) ||
                    isChanged(edu.institution, compareEdu?.institution)
                  }
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm text-surface-700">
                      <span className="font-semibold text-surface-900">
                        {edu.degree}
                      </span>
                      {edu.institution && (
                        <span className="text-surface-500">
                          {" "}
                          — {edu.institution}
                        </span>
                      )}
                    </p>
                    {edu.duration && (
                      <p className="text-xs text-surface-400">{edu.duration}</p>
                    )}
                  </div>
                </Line>
                {(edu.details ?? []).map((detail) => (
                  <p
                    key={detail}
                    className="mt-1 text-sm text-surface-600"
                  >
                    {detail}
                  </p>
                ))}
              </div>
            );
          })}
        </section>
      )}

      {resume.certifications.length > 0 && (
        <section className="mt-5 space-y-2">
          <SectionTitle>Certifications & Achievements</SectionTitle>
          <ul className="space-y-1">
            {resume.certifications.map((item, index) => (
              <li key={`${item}-${index}`}>
                <Line
                  highlightChanges={highlightChanges}
                  changed={isChanged(
                    item,
                    compareWith?.certifications[index]
                  )}
                  className="flex gap-2"
                >
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-surface-400" />
                  <span className="text-sm leading-relaxed text-surface-700">
                    {item}
                  </span>
                </Line>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
