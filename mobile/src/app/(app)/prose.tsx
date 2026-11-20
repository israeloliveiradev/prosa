import { Redirect } from "expo-router";

/** Rota antiga: o mentor com memória agora vive em Conversa (/talk). */
export default function ProseRoute() {
  return <Redirect href="/talk" />;
}
