"use strict";(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[116],{3121:(e,t,r)=>{r.r(t),r.d(t,{assets:()=>p,contentTitle:()=>u,default:()=>x,frontMatter:()=>l,metadata:()=>n,toc:()=>h});const n=JSON.parse('{"id":"api/redux","title":"Redux Methods","description":"When imported from history-adapter/redux, the createHistoryAdapter function returns an object with additional methods for use with Redux Toolkit.","source":"@site/docs/api/redux.mdx","sourceDirName":"api","slug":"/api/redux","permalink":"/history-adapter/api/redux","draft":false,"unlisted":false,"editUrl":"https://github.com/EskiMojo14/history-adapter/tree/main/website/docs/api/redux.mdx","tags":[],"version":"current","sidebarPosition":2,"frontMatter":{"sidebar_position":2},"sidebar":"docs","previous":{"title":"Standard Methods","permalink":"/history-adapter/api/standard"},"next":{"title":"Creating a Custom Adapter","permalink":"/history-adapter/custom"}}');var a=r(6106),o=r(6590),i=r(9058),c=r(3398),d=r(1992),s=r(4019);const l={sidebar_position:2},u="Redux Methods",p={},h=[{value:"<code>undoableReducer</code>",id:"undoablereducer",level:2},{value:"<code>withoutPayload</code>",id:"withoutpayload",level:2},{value:"<code>withPayload</code>",id:"withpayload",level:2},{value:"<code>getSelectors</code>",id:"getselectors",level:2}];function m(e){const t={a:"a",admonition:"admonition",code:"code",h1:"h1",h2:"h2",header:"header",p:"p",pre:"pre",...(0,o.R)(),...e.components};return(0,a.jsxs)(a.Fragment,{children:[(0,a.jsx)(t.header,{children:(0,a.jsx)(t.h1,{id:"redux-methods",children:"Redux Methods"})}),"\n",(0,a.jsxs)(t.p,{children:["When imported from ",(0,a.jsx)(t.code,{children:"history-adapter/redux"}),", the ",(0,a.jsx)(t.code,{children:"createHistoryAdapter"})," function returns an object with additional methods for use with Redux Toolkit."]}),"\n",(0,a.jsx)(t.pre,{children:(0,a.jsx)(t.code,{className:"language-ts",children:'import { createHistoryAdapter } from "history-adapter/redux";\r\n\r\ninterface CounterState {\r\n  value: number;\r\n}\r\n\r\nconst counterAdapter = createHistoryAdapter<CounterState>({ limit: 10 });\n'})}),"\n",(0,a.jsxs)(t.admonition,{title:"Redux Toolkit",type:"caution",children:[(0,a.jsx)(t.p,{children:"RTK is an optional peer dependency, but required to use the Redux specific entry point. Make sure you have it installed:"}),(0,a.jsxs)(d.A,{groupId:"package-manager",children:[(0,a.jsx)(s.A,{value:"npm",default:!0,children:(0,a.jsx)(t.pre,{children:(0,a.jsx)(t.code,{className:"language-bash",children:"\r\nnpm install @reduxjs/toolkit\r\n\n"})})}),(0,a.jsx)(s.A,{value:"yarn",children:(0,a.jsx)(t.pre,{children:(0,a.jsx)(t.code,{className:"language-bash",children:"\r\nyarn add @reduxjs/toolkit\r\n\n"})})}),(0,a.jsx)(s.A,{value:"pnpm",children:(0,a.jsx)(t.pre,{children:(0,a.jsx)(t.code,{className:"language-bash",children:"\r\npnpm add @reduxjs/toolkit\r\n\n"})})}),(0,a.jsx)(s.A,{value:"bun",children:(0,a.jsx)(t.pre,{children:(0,a.jsx)(t.code,{className:"language-bash",children:"\r\nbun add @reduxjs/toolkit\r\n\n"})})})]})]}),"\n",(0,a.jsxs)(t.p,{children:["All ",(0,a.jsx)(t.a,{href:"/api/standard",children:"standard methods"})," are available, plus the following:"]}),"\n",(0,a.jsx)(t.h2,{id:"undoablereducer",children:(0,a.jsx)(t.code,{children:"undoableReducer"})}),"\n",(0,a.jsxs)(t.p,{children:["A wrapper around the ",(0,a.jsx)(t.code,{children:"undoable"})," method that receives a case reducer and returns a wrapped reducer that manages undo and redo state."]}),"\n",(0,a.jsxs)(t.p,{children:["Instead of providing an ",(0,a.jsx)(t.code,{children:"isUndoable"})," callback, the reducer checks ",(0,a.jsx)(t.code,{children:"action.meta.undoable"})," to determine if the action should be tracked."]}),"\n",(0,a.jsxs)(t.admonition,{type:"info",children:[(0,a.jsxs)(t.p,{children:["In order to set ",(0,a.jsx)(t.code,{children:"action.meta.undoable"}),", Redux Toolkit requires use of ",(0,a.jsx)(t.a,{href:"https://redux-toolkit.js.org/api/createSlice#customizing-generated-action-creators",children:"prepare callbacks"}),"."]}),(0,a.jsxs)(t.p,{children:[(0,a.jsx)(t.a,{href:"#withpayload",children:(0,a.jsx)(t.code,{children:"adapter.withPayload"})})," and ",(0,a.jsx)(t.a,{href:"#withoutpayload",children:(0,a.jsx)(t.code,{children:"adapter.withoutPayload"})})," are provided for common cases."]})]}),"\n",(0,a.jsx)(c.x,{redux:!0,imports:{"@reduxjs/toolkit":"{ createSlice, PayloadAction }"},code:i.A`
const counterSlice = createSlice({
name: "counter",
initialState: counterAdapter.getInitialState({ value: 0 }),
reducers: {
  incremented: counterAdapter.undoableReducer((draft) => {
    draft.value += 1;
  }),
  incrementedBy: counterAdapter.undoableReducer(
    (draft, action: PayloadAction<number>) => {
      draft.value += action.payload;
    },
  ),
},
});

const { incremented, incrementedBy } = counterSlice.actions;

const store = makePrintStore(counterSlice.reducer);

store.dispatch(incremented());

store.dispatch(incrementedBy(5));
`}),"\n",(0,a.jsxs)(t.p,{children:["It still accepts other configuration options, such as ",(0,a.jsx)(t.code,{children:"selectHistoryState"}),"."]}),"\n",(0,a.jsx)(c.x,{redux:!0,imports:{"@reduxjs/toolkit":"{ createSlice }"},code:i.A`
const counterSlice = createSlice({
name: "counter",
initialState: { counter: counterAdapter.getInitialState({ value: 0 }) },
reducers: {
  incremented: counterAdapter.undoableReducer(
    (draft) => {
      draft.value += 1;
    },
    {
      selectHistoryState: (state: NestedState) => state.counter,
    },
  ),
},
});

const { incremented } = counterSlice.actions;

const store = makePrintStore(counterSlice.reducer);

store.dispatch(incremented());
`}),"\n",(0,a.jsxs)(t.admonition,{title:"Other methods",type:"tip",children:[(0,a.jsxs)(t.p,{children:["Other methods that update state (such as ",(0,a.jsx)(t.code,{children:"undo"}),", ",(0,a.jsx)(t.code,{children:"redo"}),", etc.) are valid case reducers and can be used with ",(0,a.jsx)(t.code,{children:"createSlice"}),"."]}),(0,a.jsx)(c.x,{redux:!0,imports:{"@reduxjs/toolkit":"{ createSlice }"},code:i.A`
const counterSlice = createSlice({
name: "counter",
initialState: counterAdapter.getInitialState({ value: 0 }),
reducers: {
  incremented: counterAdapter.undoableReducer((draft) => {
    draft.value += 1;
  }),
  undone: counterAdapter.undo,
  redone: counterAdapter.redo,
  jumped: counterAdapter.jump,
  paused: counterAdapter.pause,
  resumed: counterAdapter.resume,
  historyCleared: counterAdapter.clearHistory,
},
});

const { incremented, undone, redone, jumped, paused, resumed, historyCleared } = counterSlice.actions;

const store = makePrintStore(counterSlice.reducer);

store.dispatch(incremented());

store.dispatch(undone());

store.dispatch(redone());

store.dispatch(jumped(-1));
`})]}),"\n",(0,a.jsx)(t.h2,{id:"withoutpayload",children:(0,a.jsx)(t.code,{children:"withoutPayload"})}),"\n",(0,a.jsxs)(t.p,{children:["Creates a ",(0,a.jsx)(t.a,{href:"https://redux-toolkit.js.org/api/createSlice#customizing-generated-action-creators",children:"prepare callback"})," which accepts a single (optional) argument, ",(0,a.jsx)(t.code,{children:"undoable"}),". This is useful when you want to create an action that doesn't require a payload."]}),"\n",(0,a.jsx)(c.x,{redux:!0,imports:{"@reduxjs/toolkit":"{ createSlice }"},code:i.A`
const counterSlice = createSlice({
name: "counter",
initialState: counterAdapter.getInitialState({ value: 0 }),
reducers: {
  incremented: {
    prepare: counterAdapter.withoutPayload(),
    reducer: counterAdapter.undoableReducer((draft) => {
      draft.value += 1;
    }),
  },
},
});

const { incremented } = counterSlice.actions;

const store = makePrintStore(counterSlice.reducer);

// undefined means the action is undoable
store.dispatch(incremented());
store.dispatch(incremented(false));
store.dispatch(incremented(true));
`}),"\n",(0,a.jsx)(t.h2,{id:"withpayload",children:(0,a.jsx)(t.code,{children:"withPayload"})}),"\n",(0,a.jsxs)(t.p,{children:["Creates a ",(0,a.jsx)(t.a,{href:"https://redux-toolkit.js.org/api/createSlice#customizing-generated-action-creators",children:"prepare callback"})," which accepts two arguments, ",(0,a.jsx)(t.code,{children:"payload"})," (optional if potentially undefined) and ",(0,a.jsx)(t.code,{children:"undoable"})," (optional). This is useful when you want to create an action that requires a payload."]}),"\n",(0,a.jsx)(c.x,{redux:!0,imports:{"@reduxjs/toolkit":"{ createSlice }"},code:i.A`
const counterSlice = createSlice({
name: "counter",
initialState: counterAdapter.getInitialState({ value: 0 }),
reducers: {
  incrementedBy: {
    prepare: counterAdapter.withPayload<number>(),
    reducer: counterAdapter.undoableReducer(
      (draft, action: PayloadAction<number>) => {
        draft.value += action.payload;
      },
    ),
  },
},
});

const { incrementedBy } = counterSlice.actions;

const store = makePrintStore(counterSlice.reducer);

// undefined means the action is undoable
store.dispatch(incrementedBy(5));
store.dispatch(incrementedBy(5, false));
store.dispatch(incrementedBy(5, true));
`}),"\n",(0,a.jsx)(t.h2,{id:"getselectors",children:(0,a.jsx)(t.code,{children:"getSelectors"})}),"\n",(0,a.jsx)(t.p,{children:"Creates a set of useful selectors for the state managed by the adapter."}),"\n",(0,a.jsx)(c.x,{redux:!0,imports:{"@reduxjs/toolkit":"{ createSlice }"},code:i.A`
const counterSlice = createSlice({
name: "counter",
initialState: counterAdapter.getInitialState({ value: 0 }),
reducers: {
  incremented: counterAdapter.undoableReducer((draft) => {
    draft.value += 1;
  }),
},
selectors: {
  ...counterAdapter.getSelectors(),
},
});

const { incremented } = counterSlice.actions;

const { selectCanUndo, selectCanRedo, selectPresent, selectPaused } =
counterSlice.getSelectors();

const store = makePrintStore(counterSlice.reducer);

store.dispatch(incremented());

const print = getPrint();

print({
canUndo: selectCanUndo(store.getState()), // true if there are past states
canRedo: selectCanRedo(store.getState()), // true if there are future states
present: selectPresent(store.getState()),
paused: selectPaused(store.getState()),
});
`}),"\n",(0,a.jsx)(t.p,{children:"An input selector can be provided if the state is nested, which will be used to select the relevant slice of state."}),"\n",(0,a.jsx)(c.x,{redux:!0,imports:{"@reduxjs/toolkit":"{ createSlice }"},code:i.A`
const initialState = { counter: counterAdapter.getInitialState({ value: 0 }) };

const counterSlice = createSlice({
name: "counter",
initialState,
reducers: {
  incremented: counterAdapter.undoableReducer(
    (draft) => {
      draft.value += 1;
    },
    {
      selectHistoryState: (state: typeof initialState) => state.counter,
    },
  ),
},
selectors: {
  ...counterAdapter.getSelectors((state: typeof initialState) => state.counter),
},
});

const { incremented } = counterSlice.actions;

const { selectCanUndo, selectCanRedo, selectPresent, selectPaused } =
counterSlice.getSelectors();

const store = makePrintStore(counterSlice.reducer);

store.dispatch(incremented());

const print = getPrint();

print({
canUndo: selectCanUndo(store.getState()), // true if there are past states
canRedo: selectCanRedo(store.getState()), // true if there are future states
present: selectPresent(store.getState()),
paused: selectPaused(store.getState()),
});
`})]})}function x(e={}){const{wrapper:t}={...(0,o.R)(),...e.components};return t?(0,a.jsx)(t,{...e,children:(0,a.jsx)(m,{...e})}):m(e)}},3398:(e,t,r)=>{r.d(t,{x:()=>u});var n=r(7378),a=r(9058),o=r(8357),i=r(4830),c=r(6106);const{ts:d,tsx:s,css:l}=a.A,u=(0,i.n)((function(e){let{code:t,imports:r={},includeCounterSetup:a=!0,redux:u,...p}=e;if(a){((e,t,r)=>{e[t]?e[t].includes(r)||(e[t]=e[t].replace(" }",`, ${r} }`)):e[t]=`{ ${r} }`})(r,u?"history-adapter/redux":"history-adapter","createHistoryAdapter")}const h=(0,i.m)((0,n.useMemo)((()=>({"/tsconfig.json":{code:JSON.stringify({compilerOptions:{strict:!0,module:"commonjs",jsx:"react-jsx",jsxImportSource:"mini-jsx",esModuleInterop:!0,sourceMap:!0,allowJs:!0,lib:["es6","dom"],rootDir:"src",moduleResolution:"node"}}),hidden:!0},"/reduxUtils.ts":{hidden:!0,code:d`
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
`},"/utils.tsx":{hidden:!0,code:s`
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
`},"/styles.css":{hidden:!0,code:l`
            @import "highlight.js/styles/github.css";
            code {
              font-family: "Fira Code", monospace;
              font-size: 90%;
            }
            th {
              text-align: left;
              font-family: "Lato", sans-serif;
            }
          `},"/index.ts":d`
import "./styles.css";
${u&&d`
import { makePrintStore } from "./reduxUtils";
`}
import { getPrint } from "./utils";
${Object.entries(r).map((e=>{let[t,r]=e;return`import ${r} from "${t}";`})).join("\n")}
${!u&&d`
const print = getPrint();
`}${a&&d`

interface CounterState {
  value: number;
}

const counterAdapter = createHistoryAdapter<CounterState>({ limit: 10 });

`}
${t}
`})),[r,t,a,u]),"/index.ts");return(0,c.jsx)(o.l,{template:"vanilla-ts",...p,customSetup:{...p.customSetup,dependencies:{"highlight.js":"latest","mini-jsx":"latest",...u&&{"@reduxjs/toolkit":"latest"},...p.customSetup?.dependencies}},files:h,options:{editorHeight:"500px",editorWidthPercentage:u?55:65,activeFile:"/index.ts",...p.options,externalResources:["https://fonts.googleapis.com/css2?family=Fira+Code:wght@300..700&family=Lato:ital,wght@0,100;0,300;0,400;0,700;0,900;1,100;1,300;1,400;1,700;1,900&display=swap",...p.options?.externalResources??[]]}})}))}}]);