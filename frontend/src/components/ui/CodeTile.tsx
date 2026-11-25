/** Code tile (DESIGN_SYSTEM.md §5): a mono code on a raised tile — `US-CO`, `GOV.UK`. */

import clsx from "clsx";

export function CodeTile({ code, title, className }: { code: string; title?: string; className?: string }) {
  return (
    <span
      title={title}
      className={clsx(
        "inline-block whitespace-nowrap rounded-code border border-bd-subtle bg-bg-raised px-1.5 py-1 text-center font-mono text-code font-medium text-tx-secondary",
        className,
      )}
    >
      {code}
    </span>
  );
}

/** Short code for a source, for the code tile beside its items. */
export function sourceCode(name: string): string {
  const known: [RegExp, string][] = [
    [/gov\.uk/i, "GOV.UK"],
    [/federal register/i, "FED REG"],
    [/european commission/i, "EC"],
    [/eur-lex|eu ai act/i, "EUR-LEX"],
    [/incident database/i, "AIID"],
    [/arxiv/i, "ARXIV"],
    [/nist/i, "NIST"],
    [/owasp/i, "OWASP"],
    [/mitre/i, "MITRE"],
    [/stanford/i, "HAI"],
    [/technology review/i, "MIT TR"],
    [/techcrunch/i, "TC"],
    [/cisa/i, "CISA"],
    [/iso/i, "ISO"],
    [/register/i, "REG"],
  ];
  for (const [re, code] of known) if (re.test(name)) return code;
  return name.replace(/[^A-Za-z]/g, "").slice(0, 4).toUpperCase() || "SRC";
}
