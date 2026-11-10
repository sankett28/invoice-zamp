import React from "react";

export function ZampLogo({
  className = "",
  iconClassName = "h-4 w-auto",
  withWordmark = true,
}: {
  className?: string;
  iconClassName?: string;
  withWordmark?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 align-middle select-none shrink-0 text-current ${className}`}>
      {/* Authentic Zamp icon SVG inheriting currentColor */}
      <svg
        viewBox="0 0 49 40"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        className={`${iconClassName} shrink-0`}
        aria-label="Zamp Icon"
      >
        <path d="M0 16.815L9.23561 0H49L39.7644 16.815H0Z" />
        <path d="M0 39.1603L9.23561 22.3438H49L39.7644 39.1603H0Z" />
      </svg>
      {withWordmark && (
        <span className="font-bold text-sm tracking-tight lowercase leading-none text-current">
          zamp
        </span>
      )}
    </span>
  );
}
