/** Color tokens for inline styles / SVG (keep in sync with tailwind.config.js). */

export const T = {
  bgBase: "#0B0F13",
  bgSurface: "#131A20",
  bgRaised: "#19222B",
  bdSubtle: "#26323C",
  bdStrong: "#3A464F",
  txPrimary: "#E4E9EC",
  txSecondary: "#A8B3BA",
  txMuted: "#7F8B93",
  accent: "#5FC3D7",
  critical: "#F3726B",
  high: "#EE8A45",
  watch: "#E3A63A",
  positive: "#4FB477",
  info: "#6AA8E8",
  emerging: "#A78BFA",
} as const;

/** Radar sweep green: brighter than `positive` so the sweep reads at 20px. */
export const SWEEP = "#4FE58F";
