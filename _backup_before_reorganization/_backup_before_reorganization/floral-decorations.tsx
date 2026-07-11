"use client";

/** Floral SVG decorations — elegant leaf/petal motifs. */

export function FloralCorner({
  className = "",
  size = 120,
  flip = false,
}: {
  className?: string;
  size?: number;
  flip?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      style={{ transform: flip ? "scaleX(-1)" : undefined }}
      fill="none"
    >
      <g opacity="0.85">
        {/* main leaf */}
        <path
          d="M5 5 C 35 15 55 35 65 65 C 45 55 25 35 5 25 Z"
          fill="currentColor"
          opacity="0.55"
        />
        {/* secondary leaf */}
        <path
          d="M5 5 C 20 12 32 22 40 38 C 28 30 16 18 8 10 Z"
          fill="currentColor"
          opacity="0.35"
        />
        {/* stem */}
        <path
          d="M5 5 Q 30 25 55 55"
          stroke="currentColor"
          strokeWidth="0.6"
          fill="none"
          opacity="0.5"
        />
        {/* berries */}
        <circle cx="58" cy="60" r="2.5" fill="currentColor" opacity="0.7" />
        <circle cx="48" cy="50" r="2" fill="currentColor" opacity="0.5" />
        <circle cx="40" cy="42" r="1.6" fill="currentColor" opacity="0.4" />
        {/* small buds */}
        <path d="M62 68 Q 66 72 64 76 Q 60 72 62 68 Z" fill="currentColor" opacity="0.6" />
      </g>
    </svg>
  );
}

export function FloralDivider({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 text-gold ${className}`}>
      <span className="h-px w-16 bg-gradient-to-r from-transparent to-gold/70" />
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path
          d="M14 4 C 18 8 20 12 14 18 C 8 12 10 8 14 4 Z"
          fill="currentColor"
          opacity="0.7"
        />
        <path
          d="M14 24 C 10 20 8 16 14 10 C 20 16 18 20 14 24 Z"
          fill="currentColor"
          opacity="0.5"
        />
        <circle cx="14" cy="14" r="1.4" fill="currentColor" />
      </svg>
      <span className="h-px w-16 bg-gradient-to-l from-transparent to-gold/70" />
    </div>
  );
}

export function FloralBranch({ className = "", width = 200 }: { className?: string; width?: number }) {
  return (
    <svg
      viewBox="0 0 200 60"
      width={width}
      height={width * 0.3}
      className={className}
      fill="none"
    >
      <path
        d="M10 30 Q 60 10 100 30 T 190 30"
        stroke="currentColor"
        strokeWidth="0.8"
        opacity="0.6"
      />
      {/* leaves along the branch */}
      <g opacity="0.7">
        <path d="M40 24 Q 48 16 54 22 Q 48 28 40 24 Z" fill="currentColor" />
        <path d="M70 36 Q 78 44 84 38 Q 78 32 70 36 Z" fill="currentColor" />
        <path d="M110 22 Q 118 14 124 20 Q 118 26 110 22 Z" fill="currentColor" />
        <path d="M140 38 Q 148 46 154 40 Q 148 34 140 38 Z" fill="currentColor" />
        <path d="M165 26 Q 173 18 179 24 Q 173 30 165 26 Z" fill="currentColor" />
      </g>
      <circle cx="100" cy="30" r="2" fill="currentColor" />
    </svg>
  );
}

/** Falling petals background animation. */
export function FloatingPetals({ count = 12 }: { count?: number }) {
  const petals = Array.from({ length: count }, (_, i) => {
    const left = (i * 8.3 + 5) % 100;
    const duration = 18 + (i % 5) * 4;
    const delay = (i * 1.7) % 20;
    const size = 8 + (i % 4) * 3;
    const hue = i % 3;
    return (
      <span
        key={i}
        className="petal"
        style={{
          left: `${left}%`,
          bottom: "-30px",
          width: size,
          height: size,
          animationDuration: `${duration}s`,
          animationDelay: `${delay}s`,
        }}
      >
        <svg viewBox="0 0 20 20" width={size} height={size}>
          <path
            d="M10 2 C 14 6 16 12 10 18 C 4 12 6 6 10 2 Z"
            fill={hue === 0 ? "#8DA982" : hue === 1 ? "#C9A961" : "#E8DFCB"}
            opacity="0.5"
          />
        </svg>
      </span>
    );
  });
  return <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">{petals}</div>;
}
