import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import type { ReactNode } from "react";
import { queryClient, persistOptions } from "@/api/query-client";
import { AppBootstrap, useProgressReady } from "@/features/shell/app-bootstrap";

export { useProgressReady };

export function ProsaQueryProvider({ children }: { children: ReactNode }) {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <AppBootstrap>{children}</AppBootstrap>
    </PersistQueryClientProvider>
  );
}
