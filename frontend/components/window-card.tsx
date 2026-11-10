import React from "react";

export function WindowCard({
  title,
  children,
  className = "",
  headerRight,
  darkHeader = false,
}: {
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerRight?: React.ReactNode;
  darkHeader?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-border bg-card shadow-md overflow-hidden flex flex-col transition-all duration-200 ${className}`}
    >
      {/* Window Top Bar with macOS three dots */}
      <div
        className={`flex items-center justify-between px-4 py-2.5 border-b border-border ${
          darkHeader ? "bg-black/20" : "bg-muted/40"
        }`}
      >
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57] inline-block shadow-2xs" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E] inline-block shadow-2xs" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#28C840] inline-block shadow-2xs" />
        </div>
        {title && (
          <span className="text-[11px] font-mono font-medium text-muted-foreground truncate px-2">
            {title}
          </span>
        )}
        {headerRight ? <div>{headerRight}</div> : <div className="w-12" />}
      </div>
      <div className="p-5 flex-1 flex flex-col justify-between">{children}</div>
    </div>
  );
}
