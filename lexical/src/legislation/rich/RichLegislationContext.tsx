import React, { createContext, useState, FC, useMemo } from "react";

export const RichLegislationContext = createContext<{
  nodeKey?: string;
  setNodeKey: (value?: string) => void;
}>({
  nodeKey: undefined,
  setNodeKey: () => {},
});

export const RichLegislationContextProvider: FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [nodeKey, setNodeKey] = useState<string | undefined>(undefined);
  const value = useMemo(() => ({ nodeKey, setNodeKey }), [nodeKey]);

  return (
    <RichLegislationContext.Provider value={value}>
      {children}
    </RichLegislationContext.Provider>
  );
};
