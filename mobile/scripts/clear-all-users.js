const { execSync } = require('child_process');

try {
  const psqlCmd = `docker exec prosa-postgres psql -U prosa -d prosa -c "TRUNCATE users, auth_sessions, srs_cards, srs_review_logs, user_badges, exam_attempts, usage_events, daily_lessons, user_recovery_codes, study_tracks, user_retention_logs, duel_runs, placement_attempts, placement_seen, learner_memory, learner_profile, prosa_score_attempts, prosa_score_seen, journal_pairs, ownlife_notes, tutor_dossiers, tutor_checkpoints CASCADE;"`;
  console.log(execSync(psqlCmd).toString());
  console.log("Postgres user data truncated successfully.");
} catch (e) {
  console.error("Postgres error:", e.message);
}

try {
  // Flush redis
  execSync(`docker exec prosa-redis sh -c 'redis-cli -a "3)y<1[W9T./'\\''q\\"[h|_O\\}W[\\ZC\`" FLUSHALL'`);
  console.log("Redis flushed successfully.");
} catch (e) {
  // Try without auth or with alternative
  try {
    const fs = require('fs');
    const env = fs.readFileSync('secrets/runtime.env', 'utf8');
    const m = env.match(/REDIS_PASSWORD=(.*)/);
    if (m) {
      const pass = m[1].trim();
      execSync(`docker exec prosa-redis redis-cli -a "${pass}" FLUSHALL`);
      console.log("Redis flushed with runtime pass.");
    }
  } catch (err) {
    console.warn("Redis flush note:", err.message);
  }
}
