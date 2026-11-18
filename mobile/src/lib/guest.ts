export function isPublicPath(pathname: string): boolean {
  const path = pathname.split("?")[0].replace(/\/+$/, "") || "/";
  return (
    path === "/account" ||
    path === "/reset" ||
    path.startsWith("/cert") ||
    path.startsWith("/dossier/") ||
    path === "/dev/ui"
  );
}
