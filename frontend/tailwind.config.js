/** Design tokens — "Watch Board" (DESIGN_SYSTEM.md, DEC-033).
 * Keep hex values in sync with src/lib/tokens.ts (used for inline SVG/dynamic styles). */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: { base: "#0B0F13", surface: "#131A20", raised: "#19222B" },
        bd: { subtle: "#26323C", strong: "#3A464F" },
        tx: { primary: "#E4E9EC", secondary: "#A8B3BA", muted: "#7F8B93" },
        accent: "#5FC3D7",
        notice: "#2B2412",
        sev: {
          critical: "#F3726B",
          high: "#EE8A45",
          watch: "#E3A63A",
          positive: "#4FB477",
          info: "#6AA8E8",
          emerging: "#A78BFA",
        },
      },
      fontFamily: {
        sans: ["'IBM Plex Sans'", "system-ui", "-apple-system", "'Segoe UI'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "'SF Mono'", "Menlo", "Consolas", "monospace"],
      },
      // DESIGN_SYSTEM.md §4. Use these steps; don't scatter arbitrary sizes.
      fontSize: {
        code: ["10.5px", "1"], // code tiles
        meta: ["11px", "1.45"], // status strip, counts, mono date columns
        xs: ["12px", "1.45"], // labels
        detail: ["12.5px", "1.45"], // detail lines
        sm: ["13px", "1.45"], // panel titles, controls
        row: ["13.5px", "1.4"], // row titles
        base: ["14px", "1.55"], // running text
        lg: ["16px", "1.4"],
        xl: ["20px", "1.3"], // page titles
        tile: ["30px", "1.15"], // tile numerals
      },
      borderRadius: { panel: "6px", ctl: "4px", code: "3px" },
    },
  },
  plugins: [],
};
