import React from "react";

interface BayoraLogoProps {
  variant?: "symbol" | "lockup" | "compact" | "monochrome";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showWordmark?: boolean;
}

export function BayoraLogo({
  variant = "lockup",
  size = "md",
  className = "",
  showWordmark = true,
}: BayoraLogoProps) {
  const sizeMap = {
    sm: { symbol: 24, font: "text-sm", sub: "text-[9px]" },
    md: { symbol: 32, font: "text-base", sub: "text-[10px]" },
    lg: { symbol: 40, font: "text-lg", sub: "text-xs" },
    xl: { symbol: 52, font: "text-2xl", sub: "text-sm" },
  };

  const dim = sizeMap[size];

  if (variant === "symbol" || variant === "compact") {
    return (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        width={dim.symbol}
        height={dim.symbol}
        className={`shrink-0 ${className}`}
        aria-label="BAYORA Security"
      >
        <path
          d="M24 4L38 9.5V21C38 30.5 32 39 24 44C16 39 10 30.5 10 21V9.5L24 4Z"
          stroke="#4338ca"
          strokeWidth="2.5"
          strokeLinejoin="round"
          className="stroke-indigo-600 dark:stroke-indigo-400"
          fill="#0f172a"
        />
        <rect
          x="20"
          y="20"
          width="8"
          height="8"
          rx="2"
          fill="#6366f1"
          stroke="#818cf8"
          strokeWidth="1.5"
          className="fill-indigo-500"
        />
        <circle cx="17" cy="16" r="3" fill="#f43f5e" />
        <path d="M19 18L21 21" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="2 1" />
        <circle cx="17" cy="30" r="3" fill="#3b82f6" />
        <path d="M19 28L21 25" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="2 1" />
        <circle cx="31" cy="23" r="3" fill="#10b981" />
        <path d="M27 24H29" stroke="#10b981" strokeWidth="1.5" />
        <circle cx="24" cy="10" r="1.5" fill="#a5b4fc" />
      </svg>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg
        viewBox="0 0 48 48"
        fill="none"
        width={dim.symbol}
        height={dim.symbol}
        className="shrink-0"
        aria-hidden="true"
      >
        <path
          d="M24 4L38 9.5V21C38 30.5 32 39 24 44C16 39 10 30.5 10 21V9.5L24 4Z"
          stroke="#4338ca"
          strokeWidth="2.5"
          strokeLinejoin="round"
          className="stroke-indigo-600 dark:stroke-indigo-400"
          fill="#0f172a"
        />
        <rect
          x="20"
          y="20"
          width="8"
          height="8"
          rx="2"
          fill="#6366f1"
          stroke="#818cf8"
          strokeWidth="1.5"
          className="fill-indigo-500"
        />
        <circle cx="17" cy="16" r="3" fill="#f43f5e" />
        <path d="M19 18L21 21" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="2 1" />
        <circle cx="17" cy="30" r="3" fill="#3b82f6" />
        <path d="M19 28L21 25" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="2 1" />
        <circle cx="31" cy="23" r="3" fill="#10b981" />
        <path d="M27 24H29" stroke="#10b981" strokeWidth="1.5" />
        <circle cx="24" cy="10" r="1.5" fill="#a5b4fc" />
      </svg>
      {showWordmark && (
        <div className="flex flex-col select-none">
          <span
            className={`font-black tracking-wider text-slate-900 dark:text-slate-100 ${dim.font} leading-none`}
          >
            BAYORA
          </span>
          <span
            className={`font-mono font-semibold tracking-widest uppercase text-indigo-600 dark:text-indigo-400 ${dim.sub} mt-1`}
          >
            AI Safety Platform
          </span>
        </div>
      )}
    </div>
  );
}
