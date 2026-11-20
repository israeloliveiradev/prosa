import { Redirect } from "expo-router";

/** Rota antiga: a conversa com o mentor agora vive em Conversa (/talk). */
export default function MentorChatRoute() {
  return <Redirect href="/talk" />;
}
