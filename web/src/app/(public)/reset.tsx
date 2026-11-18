import { useEffect } from "react";
import { useRouter } from "expo-router";

export default function ResetRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redireciona imediatamente para a tela única oficial de login
    router.replace("/account");
  }, [router]);

  return null;
}
