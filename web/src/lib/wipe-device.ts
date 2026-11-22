import { resetGuide } from "@/lib/guide";
import { resetJourney } from "@/lib/journey";
import { kv } from "@/lib/kv";

export function wipeDeviceStudy(userId?: string): void {
  // Import tardio: lib/progress → lib/api → api/http → wipe-device formaria um ciclo de require.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { clearLocalProgress } = require("@/lib/progress") as typeof import("@/lib/progress");
  clearLocalProgress();
  resetGuide();
  resetJourney();
  kv.delete("prosa.onboarding.v1");
  kv.delete("prosa.query.v1");
  if (userId) {
    kv.delete(`prosa.news.v4.${userId}`);
    kv.delete(`prosa.news.v3.${userId}`);
  }
}
