"use strict";(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[199],{880:(e,t,o)=>{o.r(t),o.d(t,{assets:()=>b,contentTitle:()=>S,default:()=>C,frontMatter:()=>x,metadata:()=>f,toc:()=>y});var r=o(2540),n=o(3023),s=o(4775),i=o(7112),a=o(4572);const{ts:c}=a.A,d={"/counterSlice.ts":c`
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { createHistoryAdapter } from "history-adapter/redux";

interface CounterState {
  value: number;
}

const counterAdapter = createHistoryAdapter({ limit: 5 });

const { selectPresent, ...historySelectors } = counterAdapter.getSelectors();

const initialState = counterAdapter.getInitialState<CounterState>({ value: 0 });

export const counterSlice = createSlice({
  name: "counter",
  initialState,
  reducers: {
    incrementedBy: counterAdapter.undoableReducer(
      (state, action: PayloadAction<number>) => {
        state.value += action.payload;
      }
    ),
    undone: counterAdapter.undo,
    redone: counterAdapter.redo,
    pauseToggled(state) {
      state.paused = !state.paused;
    },
    historyCleared: counterAdapter.clearHistory,
    reset: () => initialState,
  },
  selectors: {
    ...historySelectors,
    selectCount: (state) => selectPresent(state).value,
  },
});

export const {
  incrementedBy,
  undone,
  redone,
  pauseToggled,
  historyCleared,
  reset,
} = counterSlice.actions;

export const { selectCount, selectCanUndo, selectCanRedo, selectPaused } =
  counterSlice.selectors;
`,"/store.ts":{hidden:!0,code:c`
import { configureStore, combineSlices } from '@reduxjs/toolkit';
import { counterSlice } from './counterSlice';

export const store = configureStore({
  reducer: combineSlices(counterSlice),
});

export type AppStore = typeof store;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
`},"/hooks.ts":{hidden:!0,code:c`
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from './store';

export const useAppSelector = useSelector.withTypes<RootState>();
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
`},"/Counter.tsx":c`
import { useAppSelector, useAppDispatch } from "./hooks";
import {
  incrementedBy,
  undone,
  redone,
  pauseToggled,
  historyCleared,
  reset,
  selectCount,
  selectCanUndo,
  selectCanRedo,
  selectPaused,
} from "./counterSlice";

export function Counter() {
  const dispatch = useAppDispatch();
  const count = useAppSelector(selectCount);
  const canUndo = useAppSelector(selectCanUndo);
  const canRedo = useAppSelector(selectCanRedo);
  const paused = useAppSelector(selectPaused);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => dispatch(incrementedBy(1))}>Increment</button>
      <button onClick={() => dispatch(undone())} disabled={!canUndo}>
        Undo
      </button>
      <button onClick={() => dispatch(redone())} disabled={!canRedo}>
        Redo
      </button>
      <button onClick={() => dispatch(pauseToggled())}>
        {paused ? "Resume" : "Pause"}
      </button>
      <button onClick={() => dispatch(historyCleared())}>Clear History</button>
      <button onClick={() => dispatch(reset())}>Reset</button>
    </div>
  );
}
`,"/App.tsx":{hidden:!0,code:c`
import { Counter } from "./Counter";
import { useAppSelector } from "./hooks";
import { counterSlice } from "./counterSlice";
import Highlight from "react-highlight";

export default function App() {
  const counterState = useAppSelector(counterSlice.selectSlice);
  return (
    <div>
      <h1>Counter</h1>
      <Counter />
      <Highlight language="json">
        {JSON.stringify(counterState, null, 2)}
      </Highlight>
    </div>
  );
}
`},"/index.tsx":{hidden:!0,code:c`
import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./store";
import "./styles.css";

import App from "./App";

const root = createRoot(document.getElementById("root"));
root.render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>
);
`}},u=(0,i.n)((function(){const e=(0,i.m)(d,"/counterSlice.ts");return(0,r.jsx)(s.l,{template:"react-ts",customSetup:{dependencies:{"@reduxjs/toolkit":"latest","react-redux":"latest","react-highlight":"latest"}},files:e,options:{activeFile:"/counterSlice.ts",externalResources:["https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css"],editorHeight:"400px",editorWidthPercentage:70}})})),{ts:l}=a.A,p={"/counterStore.ts":l`
import { create } from "zustand";
import { createHistoryAdapter, HistoryState } from "history-adapter";

interface CounterState {
  value: 0;
}

interface RootState extends HistoryState<CounterState> {
  increment: () => void;
  incrementBy: (by: number) => void;
  undo: () => void;
  redo: () => void;
  togglePause: () => void;
  clearHistory: () => void;
  reset: () => void;
}

const counterAdapter = createHistoryAdapter<CounterState>();

const initialState = counterAdapter.getInitialState({ value: 0 });

export const useCounterStore = create<RootState>()((set) => ({
  ...initialState,
  incrementBy: (by) =>
    set(
      counterAdapter.undoable((state) => {
        state.value += by;
      })
    ),
  undo: () => set(counterAdapter.undo),
  redo: () => set(counterAdapter.redo),
  togglePause: () => set((prev) => ({ paused: !prev.paused })),
  clearHistory: () => set(counterAdapter.clearHistory),
  reset: () => set(initialState),
}));
`,"/Counter.tsx":l`
import { useCounterStore } from "./counterStore";

export function Counter() {
  const count = useCounterStore((state) => state.present.value);
  const paused = useCounterStore((state) => state.paused);
  const canUndo = useCounterStore((state) => !!state.past.length);
  const canRedo = useCounterStore((state) => !!state.future.length);

  const { incrementBy, undo, redo, togglePause, clearHistory, reset } =
    useCounterStore.getState();

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => incrementBy(1)}>Increment</button>
      <button onClick={() => undo()} disabled={!canUndo}>
        Undo
      </button>
      <button onClick={() => redo()} disabled={!canRedo}>
        Redo
      </button>
      <button onClick={() => togglePause()}>
        {paused ? "Resume" : "Pause"}
      </button>
      <button onClick={() => clearHistory()}>Clear History</button>
      <button onClick={() => reset()}>Reset</button>
    </div>
  );
}
`,"/App.tsx":{hidden:!0,code:l`
import { Counter } from "./Counter";
import { useCounterStore } from "./counterStore";
import Highlight from "react-highlight";

export default function App() {
  const counterState = useCounterStore((state) => state);
  return (
    <div>
      <h1>Counter</h1>
      <Counter />
      <Highlight language="json">
        {JSON.stringify(counterState, null, 2)}
      </Highlight>
    </div>
  );
}
`}},h=(0,i.n)((function(){const e=(0,i.m)(p,"/counterStore.ts");return(0,r.jsx)(s.l,{template:"react-ts",customSetup:{dependencies:{zustand:"latest","react-highlight":"latest"}},files:e,options:{activeFile:"/counterStore.ts",externalResources:["https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css"],editorHeight:"400px",editorWidthPercentage:70}})}));var m=o(8296),g=o(2491);const x={sidebar_position:1,slug:"/"},S="Setup",f={id:"setup",title:"Setup",description:'A "history adapter" for managing undoable (and redoable) state changes with immer, which pairs well with state management solutions like Redux and Zustand.',source:"@site/docs/setup.mdx",sourceDirName:".",slug:"/",permalink:"/history-adapter/",draft:!1,unlisted:!1,editUrl:"https://github.com/EskiMojo14/history-adapter/tree/main/website/docs/setup.mdx",tags:[],version:"current",sidebarPosition:1,frontMatter:{sidebar_position:1,slug:"/"},sidebar:"docs",next:{title:"API",permalink:"/history-adapter/category/api"}},b={},y=[{value:"Sandboxes",id:"sandboxes",level:2},{value:"Redux Toolkit",id:"redux-toolkit",level:3},{value:"Zustand",id:"zustand",level:3},{value:"Installation",id:"installation",level:2},{value:"Usage",id:"usage",level:2},{value:"Configuration",id:"configuration",level:3}];function j(e){const t={a:"a",code:"code",h1:"h1",h2:"h2",h3:"h3",li:"li",p:"p",pre:"pre",ul:"ul",...(0,n.R)(),...e.components};return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(t.h1,{id:"setup",children:"Setup"}),"\n",(0,r.jsxs)(t.p,{children:['A "history adapter" for managing undoable (and redoable) state changes with ',(0,r.jsx)(t.a,{href:"https://immerjs.github.io/immer/",children:"immer"}),", which pairs well with state management solutions like ",(0,r.jsx)(t.a,{href:"https://redux.js.org/",children:"Redux"})," and ",(0,r.jsx)(t.a,{href:"https://docs.pmnd.rs/zustand/getting-started/introduction",children:"Zustand"}),"."]}),"\n",(0,r.jsx)(t.p,{children:"Also includes a Redux specific version, with additional utilities for use with Redux Toolkit."}),"\n",(0,r.jsx)(t.h2,{id:"sandboxes",children:"Sandboxes"}),"\n","\n",(0,r.jsx)(t.h3,{id:"redux-toolkit",children:"Redux Toolkit"}),"\n",(0,r.jsx)(u,{}),"\n",(0,r.jsx)(t.h3,{id:"zustand",children:"Zustand"}),"\n",(0,r.jsx)(h,{}),"\n",(0,r.jsx)(t.h2,{id:"installation",children:"Installation"}),"\n",(0,r.jsx)(t.p,{children:"Install with your package manager of choice:"}),"\n","\n",(0,r.jsxs)(m.A,{groupId:"package-manager",children:[(0,r.jsx)(g.A,{value:"npm",default:!0,children:(0,r.jsx)(t.pre,{children:(0,r.jsx)(t.code,{className:"language-bash",children:"\r\nnpm install history-adapter\r\n\n"})})}),(0,r.jsx)(g.A,{value:"yarn",children:(0,r.jsx)(t.pre,{children:(0,r.jsx)(t.code,{className:"language-bash",children:"\r\nyarn add history-adapter\r\n\n"})})}),(0,r.jsx)(g.A,{value:"bun",children:(0,r.jsx)(t.pre,{children:(0,r.jsx)(t.code,{className:"language-bash",children:"\r\nbun add history-adapter\r\n\n"})})})]}),"\n",(0,r.jsx)(t.h2,{id:"usage",children:"Usage"}),"\n",(0,r.jsxs)(t.p,{children:["The main export of ",(0,r.jsx)(t.code,{children:"history-adapter"})," is the ",(0,r.jsx)(t.code,{children:"createHistoryAdapter"})," function. This function takes an optional configuration object and returns an object with useful methods for managing undoable state changes."]}),"\n",(0,r.jsxs)(t.p,{children:["For a list of all available methods, see the ",(0,r.jsx)(t.a,{href:"/category/api",children:"API reference"}),"."]}),"\n",(0,r.jsxs)(t.p,{children:["By default, history entries will be a copy of state before/after each change. However, you can use ",(0,r.jsx)(t.code,{children:"createPatchHistoryAdapter"})," to store JSON Patches instead."]}),"\n",(0,r.jsx)(t.h3,{id:"configuration",children:"Configuration"}),"\n",(0,r.jsxs)(t.p,{children:["The ",(0,r.jsx)(t.code,{children:"createHistoryAdapter"})," function accepts an optional configuration object with some of the following properties:"]}),"\n",(0,r.jsxs)(t.ul,{children:["\n",(0,r.jsxs)(t.li,{children:[(0,r.jsx)(t.code,{children:"limit"})," (number): The maximum number of history entries to store.","\n",(0,r.jsxs)(t.ul,{children:["\n",(0,r.jsx)(t.li,{children:"If not provided, all history entries will be stored."}),"\n"]}),"\n"]}),"\n"]})]})}function C(e={}){const{wrapper:t}={...(0,n.R)(),...e.components};return t?(0,r.jsx)(t,{...e,children:(0,r.jsx)(j,{...e})}):j(e)}}}]);