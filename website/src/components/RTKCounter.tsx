import type { SandpackFiles } from "@codesandbox/sandpack-react";
import code from "../lib/code";
import { CustomSandpack } from "./CustomSandpack";
import { usePatches, withPatchTabs } from "./PatchesTabs";

const { ts } = code;

export const defaultFiles = {
  "/counterSlice.ts": ts`
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
`,
  "/store.ts": {
    hidden: true,
    code: ts`
import { configureStore, combineSlices } from '@reduxjs/toolkit';
import { counterSlice } from './counterSlice';

export const store = configureStore({
  reducer: combineSlices(counterSlice),
});

export type AppStore = typeof store;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
`,
  },
  "/hooks.ts": {
    hidden: true,
    code: ts`
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from './store';

export const useAppSelector = useSelector.withTypes<RootState>();
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
`,
  },
  "/Counter.tsx": ts`
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
`,
  "/App.tsx": {
    hidden: true,
    code: ts`
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
`,
  },
  "/index.tsx": {
    hidden: true,
    code: ts`
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
`,
  },
} satisfies SandpackFiles;

export default withPatchTabs(function CounterDemo() {
  const files = usePatches(defaultFiles, "/counterSlice.ts");
  return (
    <CustomSandpack
      template="react-ts"
      customSetup={{
        dependencies: {
          "@reduxjs/toolkit": "latest",
          "react-redux": "latest",
          "react-highlight": "latest",
        },
      }}
      files={files}
      options={{
        activeFile: "/counterSlice.ts",
        externalResources: [
          "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css",
        ],
        editorHeight: "400px",
        editorWidthPercentage: 70,
      }}
    />
  );
});
