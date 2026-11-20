import { Redirect } from "expo-router";

/** Rota antiga: as cenas agora vivem em Conversa (/talk?tab=scenes). */
export default function PersonaRoute() {
  return <Redirect href="/talk?tab=scenes" />;
}
