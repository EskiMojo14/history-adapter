"use strict";(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[115],{9636:(e,t,n)=>{n.r(t),n.d(t,{assets:()=>l,contentTitle:()=>d,default:()=>p,frontMatter:()=>s,metadata:()=>c,toc:()=>u});var a=n(2540),i=n(3023),r=n(4572),o=n(6784);const s={sidebar_position:1},d="Standard Methods",c={id:"api/standard",title:"Standard Methods",description:"This page documents the standard methods available when using a history adapter instance.",source:"@site/docs/api/standard.mdx",sourceDirName:"api",slug:"/api/standard",permalink:"/history-adapter/api/standard",draft:!1,unlisted:!1,editUrl:"https://github.com/EskiMojo14/history-adapter/tree/main/website/docs/api/standard.mdx",tags:[],version:"current",sidebarPosition:1,frontMatter:{sidebar_position:1},sidebar:"docs",previous:{title:"API",permalink:"/history-adapter/category/api"},next:{title:"Redux Methods",permalink:"/history-adapter/api/redux"}},l={},u=[{value:"<code>getInitialState</code>",id:"getinitialstate",level:2},{value:"<code>undoable</code>",id:"undoable",level:2},{value:"Extracting whether a change is undoable",id:"extracting-whether-a-change-is-undoable",level:3},{value:"Nested history state",id:"nested-history-state",level:3},{value:"<code>undo</code>, <code>redo</code>, <code>jump</code>",id:"undo-redo-jump",level:2},{value:"<code>clearHistory</code>",id:"clearhistory",level:2},{value:"Pausing history",id:"pausing-history",level:2}];function h(e){const t={admonition:"admonition",code:"code",h1:"h1",h2:"h2",h3:"h3",p:"p",pre:"pre",...(0,i.R)(),...e.components};return(0,a.jsxs)(a.Fragment,{children:[(0,a.jsx)(t.h1,{id:"standard-methods",children:"Standard Methods"}),"\n",(0,a.jsx)(t.p,{children:"This page documents the standard methods available when using a history adapter instance."}),"\n",(0,a.jsx)(t.pre,{children:(0,a.jsx)(t.code,{className:"language-ts",metastring:'title="Adapter setup"',children:'import { createHistoryAdapter } from "history-adapter";\n\ninterface CounterState {\n  value: number;\n}\n\nconst counterAdapter = createHistoryAdapter<CounterState>({ limit: 10 });\n'})}),"\n",(0,a.jsx)(t.h2,{id:"getinitialstate",children:(0,a.jsx)(t.code,{children:"getInitialState"})}),"\n",(0,a.jsx)(t.p,{children:'Receives an initial state value and returns a "history state" shape.'}),"\n",(0,a.jsx)(o.x,{code:r.A`
const initialState = counterAdapter.getInitialState({ value: 0 });

print({ initialState })
`}),"\n",(0,a.jsxs)(t.admonition,{type:"tip",children:[(0,a.jsxs)(t.p,{children:["A standalone version of this method is available as ",(0,a.jsx)(t.code,{children:"getInitialState"}),"."]}),(0,a.jsx)(o.x,{includeCounterSetup:!1,imports:{"history-adapter":"{ getInitialState }"},code:r.A`
const initialState = getInitialState({ value: 0 });

print({ initialState })
`})]}),"\n",(0,a.jsx)(t.h2,{id:"undoable",children:(0,a.jsx)(t.code,{children:"undoable"})}),"\n",(0,a.jsx)(t.p,{children:"Wraps an immer recipe to automatically manage undo and redo state. Because immer wraps the state in a draft, you can safely mutate the state directly."}),"\n",(0,a.jsx)(o.x,{code:r.A`
const increment = counterAdapter.undoable((draft) => {
  draft.value += 1;
});

const initialState = counterAdapter.getInitialState({ value: 0 });

const nextState = increment(initialState);

print({ initialState, nextState })
`}),"\n",(0,a.jsxs)(t.admonition,{title:"State operators",type:"tip",children:[(0,a.jsxs)(t.p,{children:["All of the methods to update state (",(0,a.jsx)(t.code,{children:"undo"}),", ",(0,a.jsx)(t.code,{children:"redo"}),", etc.) will act mutably when passed a draft, otherwise return a new state. The same applies to the function returned by ",(0,a.jsx)(t.code,{children:"undoable"}),"."]}),(0,a.jsx)(o.x,{imports:{immer:"{ produce }"},code:r.A`
const increment = counterAdapter.undoable((draft) => {
  draft.value += 1;
});

const initialState = counterAdapter.getInitialState({ value: 0 });

const nextState = increment(initialState); // creates a new state

const withDraft = produce(initialState, (draft) => {
  increment(draft); // called as a mutator
});

print({
  initialState: initialState.present.value,
  nextState: nextState.present.value,
  withDraft: withDraft.present.value,
})
`})]}),"\n",(0,a.jsx)(t.h3,{id:"extracting-whether-a-change-is-undoable",children:"Extracting whether a change is undoable"}),"\n",(0,a.jsxs)(t.p,{children:["By default, a change is assumed to be undoable, and is added to the history stack. To have finer control over this behaviour, you can pass an ",(0,a.jsx)(t.code,{children:"isUndoable"})," function as part of the optional configuration object. This function receives the same arguments as the recipe, and should return a boolean (or ",(0,a.jsx)(t.code,{children:"undefined"}),", in which case the change is assumed to be undoable)."]}),"\n",(0,a.jsx)(o.x,{code:r.A`
const incrementBy = counterAdapter.undoable(
  (draft, amount: number) => {
    draft.value += amount;
  },
  {
    // don't bother adding to history if the amount is zero
    isUndoable: (amount) => amount !== 0,
  },
);

const initialState = counterAdapter.getInitialState({ value: 0 });

const incrementedByZero = incrementBy(initialState, 0);

const incrementedByOne = incrementBy(incrementedByZero, 1);

print({ incrementedByZero, incrementedByOne })
`}),"\n",(0,a.jsx)(t.h3,{id:"nested-history-state",children:"Nested history state"}),"\n",(0,a.jsxs)(t.p,{children:["Sometimes the state you want to manage is nested within a larger object. In this case, you can pass a ",(0,a.jsx)(t.code,{children:"selectHistoryState"})," function to ",(0,a.jsx)(t.code,{children:"undoable"})," to extract the relevant state."]}),"\n",(0,a.jsx)(o.x,{code:r.A`
interface RootState {
  counter: HistoryState<CounterState>;
}

const increment = counterAdapter.undoable(
  (draft) => {
    draft.value += 1;
  },
  {
    selectHistoryState: (state: RootState) => state.counter,
  },
);

const initialState = { counter: counterAdapter.getInitialState({ value: 0 }) };

const nextState = increment(initialState);

print({ initialState, nextState })
`}),"\n",(0,a.jsx)(t.p,{children:"It should be a function that receives the wider state object and returns the history state object."}),"\n",(0,a.jsxs)(t.h2,{id:"undo-redo-jump",children:[(0,a.jsx)(t.code,{children:"undo"}),", ",(0,a.jsx)(t.code,{children:"redo"}),", ",(0,a.jsx)(t.code,{children:"jump"})]}),"\n",(0,a.jsx)(t.p,{children:"These methods allow you to navigate the history stack."}),"\n",(0,a.jsx)(o.x,{code:r.A`
const initialState = counterAdapter.getInitialState({ value: 0 });

const increment = counterAdapter.undoable((draft) => {
  draft.value += 1;
});

const nextState = increment(initialState);

const undoneState = counterAdapter.undo(nextState);

const redoneState = counterAdapter.redo(undoneState);

// negative numbers move back, positive move forward
const jumpedState = counterAdapter.jump(redoneState, -1);

print({ nextState, undoneState, redoneState, jumpedState })
`}),"\n",(0,a.jsx)(t.h2,{id:"clearhistory",children:(0,a.jsx)(t.code,{children:"clearHistory"})}),"\n",(0,a.jsx)(t.p,{children:"Clears the history stack, while preserving the present state."}),"\n",(0,a.jsx)(o.x,{code:r.A`
const initialState = counterAdapter.getInitialState({ value: 0 });

const increment = counterAdapter.undoable((draft) => {
  draft.value += 1;
});

const nextState = increment(initialState);

const clearedState = counterAdapter.clearHistory(nextState);

print({ nextState, clearedState })
`}),"\n",(0,a.jsx)(t.h2,{id:"pausing-history",children:"Pausing history"}),"\n",(0,a.jsxs)(t.p,{children:["To pause recording of history, you can set the ",(0,a.jsx)(t.code,{children:"paused"})," flag in state to ",(0,a.jsx)(t.code,{children:"true"})," - ",(0,a.jsx)(t.code,{children:"pause"})," and ",(0,a.jsx)(t.code,{children:"resume"})," methods are provided for this purpose."]}),"\n",(0,a.jsx)(t.p,{children:"Changes made while paused will not be added to the history stack, but will still update the present state."}),"\n",(0,a.jsx)(o.x,{code:r.A`
const initialState = counterAdapter.getInitialState({ value: 0 });

const increment = counterAdapter.undoable((draft) => {
  draft.value += 1;
});

const pausedState = counterAdapter.pause(initialState);

const whilePaused = increment(pausedState);

const resumedState = counterAdapter.resume(whilePaused);

const undone = counterAdapter.undo(resumedState);

print({ initialState, pausedState, whilePaused, resumedState, undone })
`})]})}function p(e={}){const{wrapper:t}={...(0,i.R)(),...e.components};return t?(0,a.jsx)(t,{...e,children:(0,a.jsx)(h,{...e})}):h(e)}},6784:(e,t,n)=>{n.d(t,{x:()=>u});var a=n(4775),i=n(4572),r=n(7112),o=n(3696),s=n(2540);const{ts:d,tsx:c,css:l}=i.A,u=(0,r.n)((function(e){let{code:t,imports:n={},includeCounterSetup:i=!0,redux:u,...h}=e;if(i){((e,t,n)=>{e[t]?e[t].includes(n)||(e[t]=e[t].replace(" }",`, ${n} }`)):e[t]=`{ ${n} }`})(n,u?"history-adapter/redux":"history-adapter","createHistoryAdapter")}const p=(0,r.m)((0,o.useMemo)((()=>({"/tsconfig.json":{code:JSON.stringify({compilerOptions:{strict:!0,module:"commonjs",jsx:"react-jsx",jsxImportSource:"mini-jsx",esModuleInterop:!0,sourceMap:!0,allowJs:!0,lib:["es6","dom"],rootDir:"src",moduleResolution:"node"}}),hidden:!0},"/reduxUtils.ts":{hidden:!0,code:d`
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
`},"/utils.tsx":{hidden:!0,code:c`
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
${Object.entries(n).map((e=>{let[t,n]=e;return`import ${n} from "${t}";`})).join("\n")}
${!u&&d`
const print = getPrint();
`}${i&&d`

interface CounterState {
  value: number;
}

const counterAdapter = createHistoryAdapter<CounterState>({ limit: 10 });

`}
${t}
`})),[n,t,i,u]),"/index.ts");return(0,s.jsx)(a.l,{template:"vanilla-ts",...h,customSetup:{...h.customSetup,dependencies:{"highlight.js":"latest","mini-jsx":"latest",...u&&{"@reduxjs/toolkit":"latest"},...h.customSetup?.dependencies}},files:p,options:{editorHeight:"500px",editorWidthPercentage:u?55:65,activeFile:"/index.ts",...h.options,externalResources:["https://fonts.googleapis.com/css2?family=Fira+Code:wght@300..700&family=Lato:ital,wght@0,100;0,300;0,400;0,700;0,900;1,100;1,300;1,400;1,700;1,900&display=swap",...h.options?.externalResources??[]]}})}))}}]);