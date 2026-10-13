import { createContext, useContext, useState, type ReactNode } from "react";

interface RailContextValue {
  asideContent: ReactNode | null;
  setAsideContent: (content: ReactNode | null) => void;
}

const RailContext = createContext<RailContextValue>({
  asideContent: null,
  setAsideContent: () => {},
});

export function RailProvider({ children }: { children: ReactNode }) {
  const [asideContent, setAsideContent] = useState<ReactNode | null>(null);

  return (
    <RailContext.Provider value={{ asideContent, setAsideContent }}>
      {children}
    </RailContext.Provider>
  );
}

export function useRail() {
  return useContext(RailContext);
}
