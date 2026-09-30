import type { Pool } from "pg";
import { isOrgSector, type OrgSector } from "./org-sectors.js";

export async function workplaceLexicon(
  pool: Pool,
  userId: string,
  targetLang: string,
): Promise<{ sector: OrgSector; extras: string[] } | null> {
  const found = await pool.query<{ sector: string }>(
    `SELECT o.sector
     FROM org_members AS m
     JOIN organizations AS o ON o.id = m.org_id
     WHERE m.user_id = $1`,
    [userId],
  );
  const sector = found.rows[0]?.sector;
  if (!sector || !isOrgSector(sector)) {
    return null;
  }
  const extras = await pool.query<{ phrase: string }>(
    `SELECT t.phrase
     FROM org_terms AS t
     JOIN org_members AS m ON m.org_id = t.org_id
     WHERE m.user_id = $1 AND t.target_lang = $2
     ORDER BY t.created_at ASC
     LIMIT 8`,
    [userId, targetLang],
  );
  return {
    sector,
    extras: extras.rows.map((row) => row.phrase.trim()).filter((phrase) => phrase.length > 0),
  };
}
