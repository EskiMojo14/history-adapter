import Tabs from "@theme/Tabs";
import TabItem from "@theme/TabItem";
import type { ReactNode } from "react";
import { createContext, useContext, useMemo } from "react";
import type { SandpackFiles } from "@codesandbox/sandpack-react";

const PatchContext = createContext(false);

export const usePatches = <Files extends SandpackFiles>(
  files: Files,
  adapterFileName: keyof Files,
): SandpackFiles => {
  const patches = useContext(PatchContext);
  return useMemo(() => {
    if (!patches) return files;
    const adapterFile: SandpackFiles[string] = files[adapterFileName];
    const asObj =
      typeof adapterFile === "string" ? { code: adapterFile } : adapterFile;
    return {
      ...files,
      [adapterFileName]: {
        ...asObj,
        code: asObj.code
          .replace(/createHistoryAdapter/g, "createPatchHistoryAdapter")
          .replace(/HistoryState/g, "PatchHistoryState"),
      },
    };
  }, [files, adapterFileName, patches]);
};

export default function PatchesTabs({ children }: { children: ReactNode }) {
  return (
    <Tabs groupId="patches">
      <TabItem value="noPatch" label="Default">
        {children}
      </TabItem>
      <TabItem value="patch" label="JSON Patches">
        <PatchContext.Provider value={true}>{children}</PatchContext.Provider>
      </TabItem>
    </Tabs>
  );
}
