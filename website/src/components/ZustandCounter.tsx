import type { SandpackFiles } from "@codesandbox/sandpack-react";
import { CustomSandpack } from "./CustomSandpack";
import { usePatches, withPatchTabs } from "./PatchesTabs";
import code from "../lib/code";

const { ts } = code;

export const defaultFiles = {
  "/counterStore.ts": ts`
import { create } from "zustand";
import { createHistoryAdapter, HistoryState } from "history-adapter";

interface CounterState {
  value: 0;
}

interface RootState extends HistoryState<CounterState> {
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
`,
  "/Counter.tsx": ts`
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
`,
  "/App.tsx": {
    hidden: true,
    code: ts`
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
`,
  },
} satisfies SandpackFiles;

export default withPatchTabs(function CounterDemo() {
  const files = usePatches(defaultFiles, "/counterStore.ts");
  return (
    <CustomSandpack
      template="react-ts"
      customSetup={{
        dependencies: {
          zustand: "latest",
          "react-highlight": "latest",
        },
      }}
      files={files}
      options={{
        activeFile: "/counterStore.ts",
        externalResources: [
          "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css",
        ],
        editorHeight: "400px",
        editorWidthPercentage: 70,
      }}
    />
  );
});
