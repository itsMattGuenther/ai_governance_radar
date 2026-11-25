/** Static public build (DEC-029): data comes from JSON snapshots published with the
 * site, and everything that writes (ingest, source edits, import) is hidden. */
export const STATIC_MODE = import.meta.env.VITE_STATIC_DATA === "1";
