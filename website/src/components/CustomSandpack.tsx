import type { SandpackProps } from "@codesandbox/sandpack-react";
import { Sandpack } from "@codesandbox/sandpack-react";
import { dracula, githubLight } from "@codesandbox/sandpack-themes";
import { useColorMode } from "@docusaurus/theme-common";

const removeLeadingTrailingNewlines: typeof String.raw = (str, ...args) =>
  String.raw(str, ...args)
    .replace(/^\n/, "")
    .replace(/\n$/, "");

export const code = removeLeadingTrailingNewlines;

export function CustomSandpack(props: SandpackProps) {
  const { colorMode } = useColorMode();
  const theme = colorMode === "dark" ? dracula : githubLight;
  return (
    <Sandpack
      {...props}
      theme={
        typeof props.theme === "string"
          ? props.theme
          : {
              ...theme,
              font: {
                body: "var(--ifm-font-family-base)",
                mono: "var(--ifm-font-family-monospace)",
                size: "var(--ifm-code-font-size)",
                lineHeight: "var(--ifm-pre-line-height)",
              },
              ...props.theme,
            }
      }
      customSetup={{
        ...props.customSetup,
        dependencies: {
          "history-adapter": "latest",
          ...props.customSetup?.dependencies,
        },
      }}
    />
  );
}
