import type { SandpackProps } from "@codesandbox/sandpack-react";
import { CustomSandpack } from "./CustomSandpack";
import code from "../lib/code";

const { ts, tsx, css } = code;

export function ConsoleSandbox({
  code,
  imports = {},
  includeCounterSetup = true,
  ...props
}: {
  code: string;
  imports?: Record<string, string>;
  includeCounterSetup?: boolean;
} & Omit<SandpackProps, "files">) {
  if (includeCounterSetup) {
    if (!imports["history-adapter"]) {
      imports["history-adapter"] = "{ createHistoryAdapter }";
    } else if (!imports["history-adapter"].includes("createHistoryAdapter")) {
      imports["history-adapter"] = imports["history-adapter"].replace(
        " }",
        ", createHistoryAdapter }",
      );
    }
  }
  return (
    <CustomSandpack
      template="vanilla-ts"
      {...props}
      customSetup={{
        ...props.customSetup,
        dependencies: {
          "highlight.js": "latest",
          "mini-jsx": "latest",
          ...props.customSetup?.dependencies,
        },
      }}
      files={{
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
          
            return function print(title: string, value: unknown) {
              const code = <code className="hljs json" />;
              code.innerHTML = highlight(JSON.stringify(value, null, 2) ?? "undefined", {
                language: "json",
              }).value;
              const tr = (
                <tr>
                  <td>
                    <code>{title}</code>
                  </td>
                  <td>
                    <pre>{code}</pre>
                  </td>
                </tr>
              );
              tbody.appendChild(tr);
            };
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
      }}
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
}
