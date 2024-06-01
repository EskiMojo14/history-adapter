import type { SandpackProps } from "@codesandbox/sandpack-react";
import { CustomSandpack } from "./CustomSandpack";
import code from "../lib/code";
import { usePatches, withPatchTabs } from "./PatchesTabs";
import { useMemo } from "react";

const { ts, tsx, css } = code;

const addToImports = (
  imports: Record<string, string>,
  path: string,
  name: string,
) => {
  if (!imports[path]) {
    imports[path] = `{ ${name} }`;
  } else if (!imports[path].includes(name)) {
    imports[path] = imports[path].replace(" }", `, ${name} }`);
  }
};

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
    addToImports(imports, path, "createHistoryAdapter");
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
        "/reduxUtils.ts": {
          hidden: true,
          code: ts`
import { configureStore, Action, Reducer } from "@reduxjs/toolkit";
import { getPrint } from "./utils";

export function makePrintStore<S, A extends Action>(reducer: Reducer<S, A>) {
  const print = getPrint(
    { name: "State", value: "Action" },
    { highlightName: true },
  );
  function wrappedReducer(state: S | undefined, action: A) {
    const newState = reducer(state, action);
    print(JSON.stringify(newState, null, 2), action);
    return newState;
  }
  return configureStore({ reducer: wrappedReducer });
}
`,
        },
        "/utils.tsx": {
          hidden: true,
          code: tsx`
import { highlight } from "highlight.js";

export function getPrint(
  { name = "Name", value = "Value" }: Partial<Record<"name" | "value", string>> = {},
  { highlightName }: { highlightName?: boolean; } = {},
) {
  const tbody = (
    <tbody>
      <tr>
        <th>{name}</th>
        <th>{value}</th>
      </tr>
    </tbody>
  );
  document.body.appendChild(<table>{tbody}</table>);

  function print(table: Record<string, unknown>): void;
  function print(title: string, value: unknown): void;
  function print(
    titleOrTable: string | Record<string, unknown>,
    value?: unknown,
  ) {
    if (typeof titleOrTable === "object") {
      Object.entries(titleOrTable).forEach(([title, value]) =>
        print(title, value),
      );
      return;
    }
    const nameCode = <code className={highlightName ? "hljs json" : ""} />;
    if (highlightName) {
      nameCode.innerHTML = highlight(titleOrTable, { language: "json" }).value;
    } else {
      nameCode.textContent = titleOrTable;
    }
    const valueCode = <code className="hljs json" />;
    valueCode.innerHTML = highlight(
      JSON.stringify(value, null, 2) ?? "undefined",
      {
        language: "json",
      },
    ).value;
    const tr = (
      <tr>
        <td>
          <pre>{nameCode}</pre>
        </td>
        <td>
          <pre>{valueCode}</pre>
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
            @import "highlight.js/styles/github.css";
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
        "/index.ts": ts`
import "./styles.css";
${
  redux &&
  ts`
import { makePrintStore } from "./reduxUtils";
`
}
import { getPrint } from "./utils";
${Object.entries(imports)
  .map(([mod, imp]) => `import ${imp} from "${mod}";`)
  .join("\n")}
${
  !redux &&
  ts`
const print = getPrint();
`
}${
          includeCounterSetup &&
          ts`

interface CounterState {
  value: number;
}

const counterAdapter = createHistoryAdapter<CounterState>({ limit: 10 });

`
        }
${code}
`,
      }),
      [imports, code, includeCounterSetup, redux],
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
        editorWidthPercentage: redux ? 55 : 65,
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
