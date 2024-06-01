import type { SandpackProps } from "@codesandbox/sandpack-react";
import { CustomSandpack } from "./CustomSandpack";
import code from "../lib/code";
import { usePatches, withPatchTabs } from "./PatchesTabs";
import { useMemo } from "react";

const { ts, tsx, css } = code;

export const ConsoleSandbox = withPatchTabs(function ConsoleSandbox({
  code,
  imports = {},
  includeCounterSetup = true,
  redux,
  ...props
}: {
  code: string;
  imports?: Record<string, string>;
  includeCounterSetup?: boolean;
  redux?: boolean;
} & Omit<SandpackProps, "files">) {
  if (includeCounterSetup) {
    const path = redux ? "history-adapter/redux" : "history-adapter";
    if (!imports[path]) {
      imports[path] = "{ createHistoryAdapter }";
    } else if (!imports[path].includes("createHistoryAdapter")) {
      imports[path] = imports[path].replace(" }", ", createHistoryAdapter }");
    }
  }
  const files = usePatches(
    useMemo(
      () => ({
        "/tsconfig.json": {
          code: JSON.stringify({
            compilerOptions: {
              strict: true,
              module: "commonjs",
              jsx: "react-jsx",
              jsxImportSource: "mini-jsx",
              esModuleInterop: true,
              sourceMap: true,
              allowJs: true,
              lib: ["es6", "dom"],
              rootDir: "src",
              moduleResolution: "node",
            },
          }),
          hidden: true,
        },
        "/utils.tsx": {
          hidden: true,
          code: tsx`
import { highlight } from "highlight.js";

export function getPrint() {
  const tbody = (
    <tbody>
      <tr>
        <th>Name</th>
        <th>Value</th>
      </tr>
    </tbody>
  );
  document.body.appendChild(<table>{tbody}</table>);

  function print(table: Record<string, unknown>): void;
  function print(title: string, value: unknown): void;
  function print(titleOrTable: string | Record<string, unknown>, value?: unknown) {
    if (typeof titleOrTable === "object") {
      Object.entries(titleOrTable).forEach(([title, value]) => print(title, value));
      return;
    }
    const code = <code className="hljs json" />;
    code.innerHTML = highlight(JSON.stringify(value, null, 2) ?? "undefined", {
      language: "json",
    }).value;
    const tr = (
      <tr>
        <td>
          <code>{titleOrTable}</code>
        </td>
        <td>
          <pre>{code}</pre>
        </td>
      </tr>
    );
    tbody.appendChild(tr);
  }

  return print;
}
`,
        },
        "/styles.css": {
          hidden: true,
          code: css`
            code {
              font-family: "Fira Code", monospace;
              font-size: 90%;
            }
            th {
              text-align: left;
              font-family: "Lato", sans-serif;
            }
          `,
        },
        "/styles.ts": {
          hidden: true,
          code: ts`
import "./styles.css";
import "highlight.js/styles/github.css";
`,
        },
        "/index.ts": ts`
import "./styles";
import { getPrint } from "./utils";
${Object.entries(imports)
  .map(([mod, imp]) => `import ${imp} from "${mod}";`)
  .join("\n")}
        
const print = getPrint();
${
  includeCounterSetup
    ? ts`

interface CounterState {
  value: number;
}

const counterAdapter = createHistoryAdapter<CounterState>({ limit: 10 });

`
    : ""
}
${code}
`,
      }),
      [imports, code, includeCounterSetup],
    ),
    "/index.ts",
  );
  return (
    <CustomSandpack
      template="vanilla-ts"
      {...props}
      customSetup={{
        ...props.customSetup,
        dependencies: {
          "highlight.js": "latest",
          "mini-jsx": "latest",
          ...(redux && { "@reduxjs/toolkit": "latest" }),
          ...props.customSetup?.dependencies,
        },
      }}
      files={files}
      options={{
        editorHeight: "500px",
        editorWidthPercentage: 65,
        activeFile: "/index.ts",
        ...props.options,
        externalResources: [
          "https://fonts.googleapis.com/css2?family=Fira+Code:wght@300..700&family=Lato:ital,wght@0,100;0,300;0,400;0,700;0,900;1,100;1,300;1,400;1,700;1,900&display=swap",
          ...(props.options?.externalResources ?? []),
        ],
      }}
    />
  );
});
