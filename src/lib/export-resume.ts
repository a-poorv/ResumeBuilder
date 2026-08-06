import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
} from "docx";
import { jsPDF } from "jspdf";
import { saveAs } from "file-saver";
import type { ResumePreviewData } from "@/types/resume";
import { cleanDisplayText, formatJobHeading } from "@/types/resume";

function sanitizeFileName(name: string): string {
  return (
    cleanDisplayText(name)
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "_")
      .slice(0, 60) || "resume"
  );
}

function contactLine(resume: ResumePreviewData): string {
  return [resume.email, resume.phone, resume.location, ...resume.links]
    .map(cleanDisplayText)
    .filter(Boolean)
    .join(" | ");
}

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 240, after: 80 },
    children: [
      new TextRun({
        text: text.toUpperCase(),
        bold: true,
        size: 22,
        font: "Arial",
      }),
    ],
  });
}

function bodyParagraph(
  text: string,
  options?: { bold?: boolean; spacingBefore?: number; italics?: boolean }
): Paragraph {
  return new Paragraph({
    spacing: { before: options?.spacingBefore ?? 60, after: 40 },
    children: [
      new TextRun({
        text: cleanDisplayText(text),
        bold: options?.bold,
        italics: options?.italics,
        size: 20,
        font: "Arial",
      }),
    ],
  });
}

function bulletParagraph(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 40, after: 40 },
    indent: { left: 360 },
    children: [
      new TextRun({
        text: `- ${cleanDisplayText(text)}`,
        size: 20,
        font: "Arial",
      }),
    ],
  });
}

/** ATS-friendly single-column DOCX (no tables, icons, or images). */
export async function downloadResumeDocx(resume: ResumePreviewData): Promise<void> {
  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: cleanDisplayText(resume.fullName).toUpperCase(),
          bold: true,
          size: 32,
          font: "Arial",
        }),
      ],
    }),
  ];

  if (resume.title) {
    children.push(
      bodyParagraph(cleanDisplayText(resume.title).toUpperCase(), { bold: true })
    );
  }

  const contact = contactLine(resume);
  if (contact) children.push(bodyParagraph(contact));

  if (resume.summary) {
    children.push(sectionHeading("Summary"));
    children.push(bodyParagraph(resume.summary));
  }

  if (resume.skills.length > 0) {
    children.push(sectionHeading("Skills"));
    children.push(bodyParagraph(resume.skills.join(", ")));
  }

  if (resume.experience.length > 0) {
    children.push(sectionHeading("Experience"));
    for (const job of resume.experience) {
      children.push(
        bodyParagraph(formatJobHeading(job), {
          bold: true,
          spacingBefore: 120,
        })
      );
      if (job.subtitle) {
        children.push(bodyParagraph(job.subtitle, { italics: true }));
      }
      if (job.duration) children.push(bodyParagraph(job.duration));
      for (const highlight of job.highlights) {
        children.push(bulletParagraph(highlight));
      }
    }
  }

  if (resume.education.length > 0) {
    children.push(sectionHeading("Education"));
    for (const edu of resume.education) {
      children.push(
        bodyParagraph(
          [edu.degree, edu.institution].filter(Boolean).join(" - "),
          { bold: true, spacingBefore: 120 }
        )
      );
      if (edu.duration) children.push(bodyParagraph(edu.duration));
      for (const detail of edu.details ?? []) {
        children.push(bulletParagraph(detail));
      }
    }
  }

  if (resume.certifications.length > 0) {
    children.push(sectionHeading("Certifications & Achievements"));
    for (const item of resume.certifications) {
      children.push(bulletParagraph(item));
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,
              bottom: 720,
              left: 720,
              right: 720,
            },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${sanitizeFileName(resume.fullName)}_Resume.docx`);
}

/** ATS-friendly single-column PDF (no tables, icons, or images). */
export function downloadResumePdf(resume: ResumePreviewData): void {
  const doc = new jsPDF({
    unit: "pt",
    format: "letter",
  });

  const margin = 54;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const writeWrapped = (
    text: string,
    options: { fontSize: number; bold?: boolean; gapAfter?: number }
  ) => {
    const safe = cleanDisplayText(text);
    if (!safe) return;
    doc.setFont("helvetica", options.bold ? "bold" : "normal");
    doc.setFontSize(options.fontSize);
    const lines = doc.splitTextToSize(safe, maxWidth) as string[];
    const lineHeight = options.fontSize + 4;
    ensureSpace(lines.length * lineHeight + (options.gapAfter ?? 6));
    for (const line of lines) {
      doc.text(line, margin, y);
      y += lineHeight;
    }
    y += options.gapAfter ?? 6;
  };

  writeWrapped(resume.fullName.toUpperCase(), {
    fontSize: 16,
    bold: true,
    gapAfter: 4,
  });
  if (resume.title) {
    writeWrapped(resume.title.toUpperCase(), {
      fontSize: 11,
      bold: true,
      gapAfter: 2,
    });
  }
  const contact = contactLine(resume);
  if (contact) writeWrapped(contact, { fontSize: 10, gapAfter: 12 });

  if (resume.summary) {
    writeWrapped("SUMMARY", { fontSize: 11, bold: true, gapAfter: 4 });
    writeWrapped(resume.summary, { fontSize: 10, gapAfter: 12 });
  }

  if (resume.skills.length > 0) {
    writeWrapped("SKILLS", { fontSize: 11, bold: true, gapAfter: 4 });
    writeWrapped(resume.skills.join(", "), { fontSize: 10, gapAfter: 12 });
  }

  if (resume.experience.length > 0) {
    writeWrapped("EXPERIENCE", { fontSize: 11, bold: true, gapAfter: 6 });
    for (const job of resume.experience) {
      writeWrapped(formatJobHeading(job), {
        fontSize: 10,
        bold: true,
        gapAfter: 2,
      });
      if (job.subtitle) {
        writeWrapped(job.subtitle, { fontSize: 10, gapAfter: 2 });
      }
      if (job.duration) {
        writeWrapped(job.duration, { fontSize: 10, gapAfter: 2 });
      }
      for (const highlight of job.highlights) {
        writeWrapped(`- ${highlight}`, { fontSize: 10, gapAfter: 2 });
      }
      y += 6;
    }
  }

  if (resume.education.length > 0) {
    writeWrapped("EDUCATION", { fontSize: 11, bold: true, gapAfter: 6 });
    for (const edu of resume.education) {
      writeWrapped(
        [edu.degree, edu.institution].filter(Boolean).join(" - "),
        { fontSize: 10, bold: true, gapAfter: 2 }
      );
      if (edu.duration) {
        writeWrapped(edu.duration, { fontSize: 10, gapAfter: 2 });
      }
      for (const detail of edu.details ?? []) {
        writeWrapped(`- ${detail}`, { fontSize: 10, gapAfter: 2 });
      }
      y += 4;
    }
  }

  if (resume.certifications.length > 0) {
    writeWrapped("CERTIFICATIONS & ACHIEVEMENTS", {
      fontSize: 11,
      bold: true,
      gapAfter: 6,
    });
    for (const item of resume.certifications) {
      writeWrapped(`- ${item}`, { fontSize: 10, gapAfter: 2 });
    }
  }

  doc.save(`${sanitizeFileName(resume.fullName)}_Resume.pdf`);
}
