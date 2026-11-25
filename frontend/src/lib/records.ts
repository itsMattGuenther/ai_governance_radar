/** Derived views of curated records. Nothing here invents a fact: every date comes
 * from a curated field or a timeline event (DEC-014, DEC-033). */

import type { EntityOut } from "./types";

/** When the record last changed: its newest timeline event, or null with no events. */
export function latestChange(entity: EntityOut): string | null {
  let latest: string | null = null;
  for (const ev of entity.events) {
    if (latest === null || ev.occurred_at > latest) latest = ev.occurred_at;
  }
  return latest;
}
