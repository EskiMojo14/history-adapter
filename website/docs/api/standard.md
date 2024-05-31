---
sidebar_position: 1
---

# Standard Methods

This page documents the standard methods available when using a history adapter instance.

```ts
import { createHistoryAdapter } from "history-adapter";

interface CounterState {
  value: number;
}

const counterAdapter = createHistoryAdapter<CounterState>({ limit: 10 });
```

## `getInitialState`

Receives an initial state value and returns a "history state" shape.

```ts
const initialState = counterAdapter.getInitialState({ value: 0 });

// { past: [], present: { value: 0 }, future: [], paused: false }
```

:::tip

A standalone version of this method is available as `getInitialState`.

```ts
import { getInitialState } from "history-adapter";

const initialState = getInitialState({ value: 0 });
```

:::

## `undoable`

Wraps an immer recipe to automatically manage undo and redo state. Because immer wraps the state in a draft, you can safely mutate the state directly.

```ts
const increment = counterAdapter.undoable((draft) => {
  draft.value += 1;
});

const initialState = counterAdapter.getInitialState({ value: 0 });

const nextState = increment(initialState);

// { past: [{ value: 0 }], present: { value: 1 }, future: [], paused: false }
```

:::tip State operators

All of the methods to update state (`undo`, `redo`, etc.) will act mutably when passed a draft, otherwise return a new state. The same applies to the function returned by `undoable`.

```ts
console.log(initialState.present.value, nextState.present.value); // 0, 1

const withDraft = produce(initialState, (draft) => {
  increment(draft);
});

console.log(initialState.present.value, withDraft.present.value); // 0, 1
```

:::

### Extracting whether a change is undoable

By default, a change is assumed to be undoable, and is added to the history stack. To have finer control over this behaviour, you can pass an `isUndoable` function as part of the optional configuration object. This function receives the same arguments as the recipe, and should return a boolean (or `undefined`, in which case the change is assumed to be undoable).

```ts
const incrementBy = counterAdapter.undoable(
  (draft, amount: number) => {
    draft.value += amount;
  },
  {
    // don't bother adding to history if the amount is zero
    // highlight-next-line
    isUndoable: (amount) => amount !== 0,
  },
);
```

### Nested history state

Sometimes the state you want to manage is nested within a larger object. In this case, you can pass a `selectHistoryState` function to `undoable` to extract the relevant state.

```ts
interface RootState {
  counter: HistoryState<CounterState>;
}

const increment = counterAdapter.undoable(
  (draft) => {
    draft.value += 1;
  },
  {
    // highlight-next-line
    selectHistoryState: (state: RootState) => state.counter,
  },
);

const initialState = { counter: counterAdapter.getInitialState({ value: 0 }) };

const nextState = increment(initialState);

// { counter: { past: [{ value: 0 }], present: { value: 1 }, future: [], paused: false } }
```

It should be a function that receives the wider state object and returns the history state object.

## `undo`, `redo`, `jump`

These methods allow you to navigate the history stack.

```ts
const undoneState = counterAdapter.undo(nextState);
// { past: [], present: { value: 0 }, future: [{ value: 1 }], paused: false }

const redoneState = counterAdapter.redo(undoneState);
// { past: [{ value: 0 }], present: { value: 1 }, future: [], paused: false }

const jumpedState = counterAdapter.jump(redoneState, -1); // negative numbers move back, positive move forward
// { past: [], present: { value: 0 }, future: [{ value: 1 }], paused: false }
```

## `clearHistory`

Clears the history stack, while preserving the present state.

```ts
const clearedState = counterAdapter.clearHistory(nextState);
// { past: [], present: { value: 1 }, future: [], paused: false }
```

## Pausing history

To pause recording of history, you can set the `paused` flag in state to `true` - `pause` and `resume` methods are provided for this purpose.

Changes made while paused will not be added to the history stack, but will still update the present state.

```ts
const pausedState = counterAdapter.pause(nextState);
// { past: [{ value: 0 }], present: { value: 1 }, future: [], paused: true }

const whilePaused = increment(pausedState);
// { past: [{ value: 0 }], present: { value: 2 }, future: [], paused: true }

const resumedState = counterAdapter.resume(whilePaused);
// { past: [{ value: 0 }], present: { value: 2 }, future: [], paused: false }

const undone = counterAdapter.undo(resumedState);
// { past: [], present: { value: 0 }, future: [{ value: 2 }], paused: false }
```
