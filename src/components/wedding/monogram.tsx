"use client";

interface MonogramProps {
  size?: number;
  className?: string;
  variant?: "default" | "ring";
}

/** Wedding logo mark. */
export function Monogram({ size = 80, className = "", variant = "default" }: MonogramProps) {
  return (
    <img
      src="/logo-wedding.png"
      alt="Mariage de Shekina & Ruth"
      className={`inline-block object-contain ${className}`}
      style={{
        width: variant === "ring" ? size * 2.6 : size * 2.2,
        height: size,
      }}
    />
  );
}
