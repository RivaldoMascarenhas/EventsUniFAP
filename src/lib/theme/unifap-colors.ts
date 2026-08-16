/**
 * UniFAP — Institutional Brand Color Palette Specification
 * Source Reference: Manual de Utilização da Logomarca UniFAP (unifapce.edu.br/institucional/manual-da-marca/)
 * 
 * Primary Institutional Colors:
 * - UniFAP Navy (Primary Blue): #002B49 (Used for dominant headers, sidebars, badges)
 * - UniFAP Gold (Secondary Yellow): #EAA023 (Used for accents, CTAs, winner highlights)
 * - UniFAP Light Blue (Accent): #0080C8 (Used for links, active highlights, sub-badges)
 * - UniFAP Gold Light: #FDB913 (Used for particle glimmers and hover accents)
 * 
 * Dark Mode / 4K Telão Surfaces:
 * - Surface Base: #000F1A
 * - Card Surface: #00182A
 * - Border Glow: rgba(234, 160, 35, 0.3)
 */

export const unifapColors = {
  navy: {
    DEFAULT: "#002B49",
    dark: "#00182A",
    darker: "#000F1A",
    mid: "#005088",
    light: "#0080C8",
    accent: "#00A3E0",
  },
  gold: {
    DEFAULT: "#EAA023",
    hover: "#D99015",
    light: "#FDB913",
    glow: "rgba(234, 160, 35, 0.4)",
  },
  neutral: {
    background: "#F8FAFC",
    surface: "#FFFFFF",
    border: "#E2E8F0",
    textPrimary: "#0F172A",
    textSecondary: "#64748B",
  },
} as const;

export type UnifapColorTokens = typeof unifapColors;
