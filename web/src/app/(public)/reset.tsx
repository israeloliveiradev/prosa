import { Redirect, useLocalSearchParams } from "expo-router";

/** Links antigos de redefinição caem na tela de conta, já no passo "esqueci a senha". */
export default function ResetRoute() {
  const params = useLocalSearchParams<{ email?: string }>();
  const email = typeof params.email === "string" ? params.email : undefined;
  return <Redirect href={{ pathname: "/account", params: email ? { mode: "forgot", email } : { mode: "forgot" } }} />;
}
