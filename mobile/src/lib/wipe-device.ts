import { resetGuide } from "@/lib/guide";
import { resetJourney } from "@/lib/journey";
import { kv } from "@/lib/kv";
import { clearLocalProgress } from "@/lib/progress";

export function wipeDeviceStudy(userId?: string): void {
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
