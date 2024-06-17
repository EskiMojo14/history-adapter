# History Adapter

![logo](./website/static/img/logo.png)

A "history adapter" for managing undoable (and redoable) state changes with [immer](https://immerjs.github.io/immer/), which pairs well with state management solutions like [Redux](https://redux.js.org/) and [Zustand](https://docs.pmnd.rs/zustand/getting-started/introduction).

Includes generic methods along with Redux-specific helpers.

```ts
import { createHistoryAdapter } from "history-adapter/redux";
import { createSlice } from "@reduxjs/toolkit";

interface CounterState {
  value: number;
}

const counterAdapter = createHistoryAdapter<CounterState>({ limit: 10 });

const counterSlice = createSlice({
  name: "counter",
  initialState: { value: 0 },
  reducers: {
    undo: counterAdapter.undo,
    redo: counterAdapter.redo,
    increment: counterAdapter.undoableReducer((state) => {
      state.value += 1;
    }),
  },
});
```

See [website](https://eskimojo14.github.io/history-adapter/) for more information.
