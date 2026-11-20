import { Redirect, type Href } from "expo-router";

/** Endereço antigo do nivelamento; a tela vive em /placement. */
export default function PlacementTestRoute() {
  return <Redirect href={"/placement" as Href} />;
}
