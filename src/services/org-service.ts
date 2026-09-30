import { randomBytes } from "node:crypto";
import type { Pool } from "pg";
import type { AuthUser } from "../auth/session.js";
import { AppError } from "../http/errors.js";
import { isOrgSector, sectorTerms, type OrgSector } from "./org-sectors.js";

interface OrgRow {
  id: string;
  name: string;
  sector: string;
  invite_code: string;
}

interface MemberRow {
  org_id: string;
  role: "owner" | "hr" | "member";
  name: string;
  sector: string;
  invite_code: string;
}

export class OrgService {
  constructor(private readonly pool: Pool) {}

  async mine(user: AuthUser) {
    const membership = await this.membership(user.id);
    if (!membership) {
      return { org: null, role: null, terms: [], roster: [] };
    }
    const extras = await this.extras(membership.org_id, user.target_lang);
    const catalog = isOrgSector(membership.sector) ? sectorTerms(membership.sector, user.target_lang) : [];
    const staff = membership.role === "owner" || membership.role === "hr";
    return {
      org: {
        name: membership.name,
        sector: membership.sector,
        invite_code: staff ? membership.invite_code : null,
      },
      role: membership.role,
      terms: [
        ...extras.map((item) => ({ phrase: item.phrase, gloss: item.gloss, source: "org" as const })),
        ...catalog.map((item) => ({ phrase: item.phrase, gloss: item.gloss, source: "catalog" as const })),
      ],
      roster: staff ? await this.roster(membership.org_id) : [],
    };
  }

  async create(user: AuthUser, input: { name: string; sector: OrgSector }) {
    const existing = await this.membership(user.id);
    if (existing) {
      throw new AppError(409, "This account already belongs to a team");
    }
    const code = randomBytes(8).toString("base64url");
    const inserted = await this.pool.query<OrgRow>(
      `INSERT INTO organizations (name, sector, invite_code, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, sector, invite_code`,
      [input.name, input.sector, code, user.id],
    );
    const org = inserted.rows[0];
    if (!org) {
      throw new AppError(500, "The team could not open");
    }
    await this.pool.query(`INSERT INTO org_members (org_id, user_id, role) VALUES ($1, $2, 'owner')`, [org.id, user.id]);
    return this.mine(user);
  }

  async join(user: AuthUser, code: string) {
    const existing = await this.membership(user.id);
    if (existing) {
      throw new AppError(409, "This account already belongs to a team");
    }
    const found = await this.pool.query<OrgRow>(
      `SELECT id, name, sector, invite_code FROM organizations WHERE invite_code = $1`,
      [code],
    );
    const org = found.rows[0];
    if (!org) {
      throw new AppError(404, "This invite was not found");
    }
    await this.pool.query(`INSERT INTO org_members (org_id, user_id, role) VALUES ($1, $2, 'member')`, [org.id, user.id]);
    return this.mine(user);
  }

  async addTerm(user: AuthUser, input: { target_lang: string; phrase: string; gloss: string }) {
    const membership = await this.staffOf(user.id);
    await this.pool.query(
      `INSERT INTO org_terms (org_id, target_lang, phrase, gloss)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (org_id, target_lang, phrase)
       DO UPDATE SET gloss = EXCLUDED.gloss`,
      [membership.org_id, input.target_lang, input.phrase, input.gloss],
    );
    return this.mine(user);
  }

  async leave(user: AuthUser) {
    const membership = await this.membership(user.id);
    if (!membership) {
      throw new AppError(404, "This account is not on a team");
    }
    const others = await this.pool.query<{ user_id: string; role: string }>(
      `SELECT user_id, role FROM org_members WHERE org_id = $1 AND user_id <> $2`,
      [membership.org_id, user.id],
    );
    if (membership.role === "owner" && others.rows.length > 0) {
      const next = others.rows.find((row) => row.role === "hr") ?? others.rows[0];
      if (next) {
        await this.pool.query(`UPDATE org_members SET role = 'owner' WHERE org_id = $1 AND user_id = $2`, [
          membership.org_id,
          next.user_id,
        ]);
      }
    }
    await this.pool.query(`DELETE FROM org_members WHERE org_id = $1 AND user_id = $2`, [membership.org_id, user.id]);
    if (others.rows.length === 0) {
      await this.pool.query(`DELETE FROM organizations WHERE id = $1`, [membership.org_id]);
    }
    return { org: null, role: null, terms: [], roster: [] };
  }

  private async roster(orgId: string) {
    const found = await this.pool.query<{
      display_name: string | null;
      level: string;
      target_lang: string;
      score: number | null;
      band: string | null;
      lexicon_size: number | null;
    }>(
      `SELECT
         u.display_name,
         COALESCE(st.level, u.level) AS level,
         COALESCE(st.target_lang, u.target_lang) AS target_lang,
         s.score,
         s.band,
         p.lexicon_size
       FROM org_members AS m
       JOIN users AS u ON u.id = m.user_id
       LEFT JOIN study_tracks AS st ON st.user_id = u.id AND st.active = true
       LEFT JOIN LATERAL (
         SELECT score, band
         FROM prosa_score_attempts
         WHERE user_id = u.id
           AND target_lang = COALESCE(st.target_lang, u.target_lang)
           AND status = 'completed'
           AND score IS NOT NULL
         ORDER BY finished_at DESC NULLS LAST
         LIMIT 1
       ) AS s ON true
       LEFT JOIN learner_profile AS p
         ON p.user_id = u.id AND p.target_lang = COALESCE(st.target_lang, u.target_lang)
       WHERE m.org_id = $1
       ORDER BY u.display_name NULLS LAST, u.id`,
      [orgId],
    );
    return found.rows.map((row) => ({
      name: row.display_name?.trim() || null,
      level: row.level,
      target_lang: row.target_lang,
      prosa_score: row.score != null && row.band ? { score: row.score, band: row.band } : null,
      lexicon: row.lexicon_size && row.lexicon_size > 0 ? row.lexicon_size : null,
    }));
  }

  private async extras(orgId: string, targetLang: string) {
    const found = await this.pool.query<{ phrase: string; gloss: string }>(
      `SELECT phrase, gloss FROM org_terms WHERE org_id = $1 AND target_lang = $2 ORDER BY created_at ASC`,
      [orgId, targetLang],
    );
    return found.rows;
  }

  private async membership(userId: string): Promise<MemberRow | undefined> {
    const found = await this.pool.query<MemberRow>(
      `SELECT m.org_id, m.role, o.name, o.sector, o.invite_code
       FROM org_members AS m
       JOIN organizations AS o ON o.id = m.org_id
       WHERE m.user_id = $1`,
      [userId],
    );
    return found.rows[0];
  }

  private async staffOf(userId: string): Promise<MemberRow> {
    const membership = await this.membership(userId);
    if (!membership || (membership.role !== "owner" && membership.role !== "hr")) {
      throw new AppError(403, "Only the team owner can add words");
    }
    return membership;
  }
}
