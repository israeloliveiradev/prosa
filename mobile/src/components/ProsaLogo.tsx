import React from "react";
import { motion } from "framer-motion";
import { useRouter } from "expo-router";
import { useAreaCopy } from "@/lib/copy/area";
import { UI } from "@/lib/copy/ui";

export interface ProsaLogoProps {
  variant?: "full" | "compact" | "icon";
  size?: "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
  href?: string;
  showDot?: boolean;
}

export function ProsaLogoIcon({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 select-none"
    >
      {/* 4px Mechanical Bevel / Bottom Base Shadow */}
      <rect x="0" y="6" width="60" height="52" rx="16" fill="#0F766E" />
      {/* Top Face of Button / Keycap in Emerald Teal */}
      <rect x="0" y="0" width="60" height="52" rx="16" fill="#0D9488" />
      {/* Inner Highlight Rim */}
      <rect
        x="1.5"
        y="1.5"
        width="57"
        height="49"
        rx="14.5"
        stroke="#14B8A6"
        strokeWidth="1.5"
        fill="none"
      />

      {/* Crisp Monogram 'P' (Spine + Open Book Page) in #FDFBF7 */}
      <rect x="14" y="11" width="7" height="30" rx="3.5" fill="#FDFBF7" />
      <path
        d="M18 11H34C40.6274 11 46 16.3726 46 23C46 29.6274 40.6274 35 34 35H18V11Z"
        fill="#FDFBF7"
      />

      {/* Open Book Page Contour Cutout inside Counter */}
      <path
        d="M21 16H33.5C37.0899 16 40 18.9101 40 22.5C40 26.0899 37.0899 29 33.5 29H21V16Z"
        fill="#0D9488"
      />
      <path
        d="M22 22.5C25.5 21 31 21.5 35 23"
        stroke="#14B8A6"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <polygon points="14,35 17.5,41 21,35" fill="#E2E8F0" />

      {/* Vibrant Spark Dot in Warm Streak Orange (#FF5722) */}
      <circle cx="48" cy="10" r="5" fill="#FF5722" />
      <circle cx="48" cy="10" r="2.2" fill="#FF8A65" />
    </svg>
  );
}

export function ProsaLogo({
  variant = "full",
  size = "md",
  className = "",
  onClick,
  href,
  showDot = true,
}: ProsaLogoProps) {
  const router = useRouter();
  const ui = useAreaCopy(UI);

  const iconSizes = {
    sm: 32,
    md: 40,
    lg: 48,
  };

  const titleSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  const subtitleSizes = {
    sm: "text-[9px] tracking-[0.18em]",
    md: "text-[10px] tracking-[0.2em]",
    lg: "text-xs tracking-[0.22em]",
  };

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick();
    } else if (href) {
      router.push(href as any);
    }
  };

  const isInteractive = Boolean(onClick || href);

  const content = (
    <div
      className={`inline-flex items-center gap-3 select-none ${
        isInteractive ? "cursor-pointer" : ""
      } ${className}`}
    >
      <ProsaLogoIcon size={iconSizes[size]} />

      {variant !== "icon" && (
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-1 leading-none">
            <span
              className={`font-black font-sans tracking-tight text-stone-900 ${titleSizes[size]}`}
            >
              {/* i18n-ignore marca */}
              PROSA
            </span>
            {showDot && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#0D9488] self-center shrink-0" />
            )}
          </div>
          {variant === "full" && (
            <span
              className={`font-bold uppercase text-[#0D9488] mt-0.5 leading-none font-sans ${subtitleSizes[size]}`}
            >
              {ui.tagline}
            </span>
          )}
        </div>
      )}
    </div>
  );

  return (
    <motion.div
      whileTap={isInteractive ? { y: 2 } : undefined}
      whileHover={isInteractive ? { opacity: 0.95 } : undefined}
      onClick={isInteractive ? handleClick : undefined}
      className="inline-block"
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
    >
      {content}
    </motion.div>
  );
}

export default ProsaLogo;
