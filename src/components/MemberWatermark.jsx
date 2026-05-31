import React from "react";
import { useAuth } from "@/lib/AuthContext";

/**
 * Wraps page content with a fixed, transparent watermark overlay showing the
 * logged-in member's ID repeated diagonally.
 *
 * - Opacity is intentionally low (0.045) so it does not distract normal use
 * - On screenshots the pattern is clearly visible and traceable by admins
 * - pointer-events:none ensures it never interferes with clicks or scrolling
 * - Only rendered for authenticated users (hides on login/public pages)
 * - The overlay is rendered at a fixed z-index above content but below modals
 */
export default function MemberWatermark({ children }) {
  const { user } = useAuth();

  // Determine the label: prefer member_code, fall back to username
  const label = user?.member_code || user?.username || user?.email || "";

  return (
    <div className="relative">
      {children}
      {label && (
        <WatermarkOverlay label={label} />
      )}
    </div>
  );
}

function WatermarkOverlay({ label }) {
  // Build the SVG pattern as a data URI — a diagonal repeating tile
  const text = label;
  const tileW = 260;
  const tileH = 120;

  const svgContent = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${tileW}" height="${tileH}">
      <text
        x="50%"
        y="55%"
        dominant-baseline="middle"
        text-anchor="middle"
        transform="rotate(-30, ${tileW / 2}, ${tileH / 2})"
        font-family="monospace, sans-serif"
        font-size="13"
        font-weight="600"
        fill="#1a1a2e"
        opacity="1"
        letter-spacing="1"
      >${text}</text>
    </svg>
  `.trim();

  const encoded = `data:image/svg+xml;utf8,${encodeURIComponent(svgContent)}`;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 40,
        pointerEvents: "none",
        backgroundImage: `url("${encoded}")`,
        backgroundRepeat: "repeat",
        backgroundSize: `${tileW}px ${tileH}px`,
        opacity: 0.045,
        userSelect: "none",
      }}
    />
  );
}
