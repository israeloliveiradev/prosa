import type { Pool } from "pg";
import { AppError } from "../http/errors.js";
import type { AuthUser } from "../auth/session.js";
import type { OnboardingQuizBody } from "../schemas/onboarding.js";
import { storedNewsSchema, type StoredNews } from "../schemas/news.js";
import type { GeminiGateway } from "./gemini-gateway.js";
import type { LessonService } from "./lesson-service.js";
import type { NeuralVoice } from "./neural-voice.js";
import { fetchHeadlines, headlineFitsInterest } from "./news-feed.js";
import type { OpsService } from "./ops.js";

export class PersonalizationService {
  constructor(
    private readonly pool: Pool,
    private readonly gemini: GeminiGateway,
    private readonly lessons: LessonService,
    private readonly neural: NeuralVoice,
    private readonly ops?: OpsService,
  ) {}

  async saveQuiz(user: AuthUser, body: OnboardingQuizBody): Promise<{
    interests: string[];
    topics: string[];
    target_lang: string;
    native_lang: string;
    tracks: Array<{ target_lang: string; through_lang: string; active: boolean }>;
    level: string;
  }> {
    const active = body.tracks.find((track) => track.active) ?? body.tracks[0];
    const level = body.level ?? user.level;
    if (user.plan !== "pro" && body.tracks.length > 1) {
      throw new AppError(402, "Multiple languages require Prosa Pro");
    }
    if (!active) {
      throw new AppError(400, "Choose at least one language");
    }
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM study_tracks WHERE user_id = $1", [user.id]);
      for (const track of body.tracks) {
        await client.query(
          `INSERT INTO study_tracks (user_id, target_lang, through_lang, active)
           VALUES ($1, $2, $3, $4)`,
          [user.id, track.target_lang, track.through_lang, track.active],
        );
      }
      await client.query(
        "UPDATE users SET interests = $1::text[], target_lang = $2, native_lang = $3, level = $4 WHERE id = $5",
        [body.interests, active.target_lang, active.through_lang, level, user.id],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    const topics = await this.gemini.suggestTopics({
      interests: body.interests,
      targetLang: active.target_lang,
      level,
      ...(body.goal ? { goal: body.goal } : {}),
    });
    return {
      interests: body.interests,
      topics,
      target_lang: active.target_lang,
      native_lang: active.through_lang,
      tracks: body.tracks,
      level,
    };
  }

  async listTracks(user: AuthUser): Promise<Array<{ target_lang: string; through_lang: string; active: boolean }>> {
    const result = await this.pool.query<{ target_lang: string; through_lang: string; active: boolean }>(
      `SELECT target_lang, through_lang, active
       FROM study_tracks
       WHERE user_id = $1
       ORDER BY created_at`,
      [user.id],
    );
    if (result.rows.length > 0) {
      return result.rows;
    }
    return [];
  }

  async activateTrack(
    user: AuthUser,
    targetLang: string,
    throughLang: string,
  ): Promise<{ target_lang: string; through_lang: string; active: boolean }> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query(
        `SELECT 1 FROM study_tracks WHERE user_id = $1 AND target_lang = $2 AND through_lang = $3`,
        [user.id, targetLang, throughLang],
      );
      if (existing.rowCount === 0) {
        throw new AppError(404, "Language pair not found");
      }
      if (user.plan !== "pro" && (user.target_lang !== targetLang || user.native_lang !== throughLang)) {
        throw new AppError(402, "Multiple languages require Prosa Pro");
      }
      await client.query(
        `UPDATE study_tracks
         SET active = (target_lang = $2 AND through_lang = $3)
         WHERE user_id = $1`,
        [user.id, targetLang, throughLang],
      );
      await client.query("UPDATE users SET target_lang = $2, native_lang = $3 WHERE id = $1", [
        user.id,
        targetLang,
        throughLang,
      ]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    return { target_lang: targetLang, through_lang: throughLang, active: true };
  }

  async generatePersonalized(user: AuthUser, selectedTopic: string): Promise<{
    lesson: Awaited<ReturnType<LessonService["generate"]>>["lesson"];
    anchors: Awaited<ReturnType<LessonService["generate"]>>["anchors"];
    audio_url: string;
    words: { text: string; offset_ms: number }[];
    cached: boolean;
  }> {
    const interests = await this.loadInterests(user.id);
    const generated = await this.lessons.generate(
      {
        user_id: user.id,
        topic: selectedTopic,
        interests,
      },
      user,
    );
    const spoken = await this.neural.speak({
      text: generated.lesson.story_text,
      lang: user.target_lang.toLowerCase(),
    });
    return {
      lesson: generated.lesson,
      anchors: generated.anchors,
      audio_url: spoken.audioUrl,
      words: spoken.words,
      cached: generated.cached,
    };
  }

  async fetchAdaptedNews(
    user: AuthUser,
    interest?: string,
    voice?: string,
    index = 0,
    level?: AuthUser["level"],
  ): Promise<{ news: StoredNews; audio_url: string; words: { text: string; offset_ms: number }[]; cached: boolean }> {
    const levelUsed = level ?? user.level;
    if (this.ops && (await this.ops.isGenerationPaused())) {
      return this.speakStored(
        user,
        await this.requireRecentNews(user.target_lang, levelUsed, 503, "Lesson generation is paused", undefined, interest),
        voice,
        true,
      );
    }
    let headlines;
    try {
      headlines = await fetchHeadlines(user.target_lang.toLowerCase(), interest);
    } catch (error) {
      await this.ops?.record("news", "error", "News feed failed", error instanceof Error ? error.message : undefined);
      return this.speakStored(
        user,
        await this.requireRecentNews(user.target_lang, levelUsed, 502, "News feed is unavailable", error, interest),
        voice,
        true,
      );
    }
    const headline = headlines[index];
    if (!headline) {
      return this.speakStored(
        user,
        await this.requireRecentNews(user.target_lang, levelUsed, 502, "News feed returned no stories", undefined, interest),
        voice,
        true,
      );
    }

    const existing = await this.pool.query<{ simplified_text_json: unknown }>(
      `SELECT simplified_text_json
       FROM news_feed_cache
       WHERE target_lang = $1 AND level = $2 AND original_url = $3
         AND created_at > now() - interval '36 hours'`,
      [user.target_lang, levelUsed, headline.url],
    );
    const cachedPayload = storedNewsSchema.safeParse(existing.rows[0]?.simplified_text_json);
    let news = cachedPayload.success ? cachedPayload.data : null;
    const cached = news !== null;
    if (!news) {
      const adapted = await this.gemini.adaptNews({
        targetLang: user.target_lang,
        nativeLang: user.native_lang,
        level: levelUsed,
        title: headline.title,
        summary: headline.summary,
        ...(headline.published ? { published: headline.published } : {}),
      });
      news = storedNewsSchema.parse({
        ...adapted,
        source_url: headline.url,
        source_title: headline.title.slice(0, 300),
        ...(headline.published ? { published: headline.published } : {}),
      });
      await this.pool.query(
        `INSERT INTO news_feed_cache (target_lang, level, original_url, simplified_text_json)
         VALUES ($1, $2, $3, $4::jsonb)
         ON CONFLICT (target_lang, level, original_url) DO UPDATE
         SET simplified_text_json = EXCLUDED.simplified_text_json, created_at = now()`,
        [user.target_lang, levelUsed, headline.url, JSON.stringify(news)],
      );
    }

    return this.speakStored(user, news, voice, cached);
  }

  private async requireRecentNews(
    targetLang: string,
    level: AuthUser["level"],
    status: 502 | 503,
    message: string,
    cause?: unknown,
    interest?: string,
  ): Promise<StoredNews> {
    const found = await this.pool.query<{ simplified_text_json: unknown; created_at: Date }>(
      `SELECT simplified_text_json, created_at
       FROM news_feed_cache
       WHERE target_lang = $1 AND level = $2 AND created_at > now() - interval '36 hours'
       ORDER BY created_at DESC
       LIMIT 8`,
      [targetLang, level],
    );
    for (const row of found.rows) {
      const parsed = storedNewsSchema.safeParse(row.simplified_text_json);
      if (!parsed.success) {
        continue;
      }
      const news = parsed.data.published ? parsed.data : { ...parsed.data, published: row.created_at.toISOString() };
      if (
        headlineFitsInterest(
          { title: news.title, url: news.source_url, summary: news.story_text, published: news.published },
          interest,
        )
      ) {
        return news;
      }
    }
    throw new AppError(status, message, cause ? { cause } : undefined);
  }

  private async speakStored(
    user: AuthUser,
    news: StoredNews,
    voice: string | undefined,
    cached: boolean,
  ): Promise<{ news: StoredNews; audio_url: string; words: { text: string; offset_ms: number }[]; cached: boolean }> {
    const spoken = await this.neural.speak({
      text: news.story_text,
      lang: user.target_lang.toLowerCase(),
      ...(voice ? { voice } : {}),
    });
    return { news, audio_url: spoken.audioUrl, words: spoken.words, cached };
  }

  private async loadInterests(userId: string): Promise<string[]> {
    const result = await this.pool.query<{ interests: string[] | null }>(
      "SELECT interests FROM users WHERE id = $1",
      [userId],
    );
    return result.rows[0]?.interests ?? [];
  }
}
