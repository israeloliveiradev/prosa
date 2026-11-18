import { request } from "./http";
import {
  ListStudyTracksResponseSchema,
  ActivateStudyTrackResponseSchema,
  type StudyTrackChoice,
  type ActivateStudyTrackInput,
  type ActivateStudyTrackResponse,
} from "./schemas/study";

/**
 * Lista as trilhas de estudo disponíveis ou ativas para a conta.
 * Suporta listStudyTracks(token) [legada] e listStudyTracks() [nova].
 */
export async function listStudyTracks(_token?: string): Promise<StudyTrackChoice[]> {
  const res = await request("/api/v1/study/tracks", {
    method: "GET",
    schema: ListStudyTracksResponseSchema,
    auth: "required",
  });
  return res.tracks;
}

/**
 * Ativa uma trilha de estudo para a conta.
 * Suporta activateStudyTrack(token, track) [legada] e activateStudyTrack(track) [nova].
 */
export async function activateStudyTrack(
  tokenOrTrack: string | ActivateStudyTrackInput,
  maybeTrack?: ActivateStudyTrackInput,
): Promise<ActivateStudyTrackResponse> {
  const track = typeof tokenOrTrack === "string" ? maybeTrack! : tokenOrTrack;

  return request<ActivateStudyTrackResponse>("/api/v1/study/activate", {
    method: "POST",
    body: track,
    schema: ActivateStudyTrackResponseSchema,
    auth: "required",
  });
}
