"use client";

import React from "react";
import { CheckCircle, WarningCircle, Prohibit, Sparkle } from "@phosphor-icons/react";

interface FormattedSummaryProps {
  text: string;
}

export function FormattedVerificationSummary({ text }: FormattedSummaryProps) {
  if (!text) return null;

  // Render markdown bold **phrase** -> <strong>phrase</strong>
  const renderFormattedInline = (str: string) => {
    const parts = str.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={idx} className="font-semibold text-foreground">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  // Split into raw lines, trimming whitespace
  const rawLines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  const introParagraphs: string[] = [];
  const bulletItems: string[] = [];
  let actionText: string | null = null;

  for (const line of rawLines) {
    // Check for title or skip redundant headers
    const lower = line.toLowerCase();
    if (lower === "**executive verification summary**" || lower === "executive verification summary" || lower === "key audit findings:" || lower === "**key audit findings:**") {
      continue;
    }

    // Check for Action line
    if (lower.startsWith("**action:**") || lower.startsWith("action:") || lower.startsWith("**action**:") || lower.startsWith("recommended action:")) {
      actionText = line;
      continue;
    }

    // Check for bullet lines
    const bulletMatch = line.match(/^[\*\•\-\u2022]\s+(.*)$/) || line.match(/^\*\s+(.*)$/);
    if (bulletMatch || line.startsWith("•") || line.startsWith("* ") || line.startsWith("- ")) {
      const content = bulletMatch ? bulletMatch[1] : line.replace(/^[\*\•\-\u2022]\s*/, "");
      bulletItems.push(content);
    } else {
      introParagraphs.push(line);
    }
  }

  return (
    <div className="space-y-3">
      {/* Intro statement */}
      {introParagraphs.map((para, idx) => (
        <p key={idx} className="text-xs sm:text-[13px] leading-relaxed text-foreground font-medium">
          {renderFormattedInline(para)}
        </p>
      ))}

      {/* Bullet Findings */}
      {bulletItems.length > 0 && (
        <div className="space-y-2 pt-0.5">
          {bulletItems.map((bullet, idx) => (
            <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-[13px] leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <div className="text-muted-foreground flex-1">
                {renderFormattedInline(bullet)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Concluding Action Row */}
      {actionText && (
        <div className="pt-2 border-t border-primary/15 flex items-start gap-2 text-xs sm:text-[13px] font-medium text-foreground">
          <div className="text-primary font-bold shrink-0 mt-0.5">
            <Sparkle size={14} weight="fill" />
          </div>
          <div className="flex-1">
            {renderFormattedInline(actionText)}
          </div>
        </div>
      )}
    </div>
  );
}
