"use client";

interface MonogramProps {
  size?: number;
  className?: string;
  variant?: "default" | "ring";
}

/** Elegant S & R monogram with optional decorative ring. */
export function Monogram({ size = 80, className = "", variant = "default" }: MonogramProps) {
  if (variant === "ring") {
    return (
      <div
        className={`relative inline-flex items-center justify-center text-gold ${className}`}
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 100 100" width={size} height={size} className="absolute inset-0">
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.8"
            opacity="0.5"
          />
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.4"
            opacity="0.3"
          />
          <path
            d="M50 4 Q 52 8 50 12 Q 48 8 50 4 Z"
            fill="currentColor"
            opacity="0.6"
          />
          <path
            d="M50 96 Q 52 92 50 88 Q 48 92 50 96 Z"
            fill="currentColor"
            opacity="0.6"
          />
        </svg>
        <span
          className="font-display relative z-10"
          style={{ fontSize: size * 0.32, letterSpacing: "0.1em" }}
        >
          S&nbsp;&amp;&nbsp;R
        </span>
      </div>
    );
  }
  return (
    <span
      className={`font-display ${className}`}
      style={{ fontSize: size, letterSpacing: "0.12em", lineHeight: 1 }}
    >
      S&nbsp;&amp;&nbsp;R
    </span>
  );
}
