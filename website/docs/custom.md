---
sidebar_position: 3
---

# Creating a Custom Adapter

While `createHistoryAdapter` and `createPatchHistoryAdapter` cover the most common ways to track history, you may want to create your history entries in a different format. This guide will show you how to create a custom adapter.

## `buildCreateHistoryAdapter`

This function allows you to create a custom adapter by providing a custom configuration object with the callbacks required.

```js
const createCustomHistoryAdapter = buildCreateHistoryAdapter({
  onCreate(config) {
    // This is called when the adapter is created
  },
  wrapRecipe(recipe) {
    // This is called when a recipe is created
    return (state, ...args) => {
      // This is called to update the state
      recipe(state.present, ...args);

      return entry;
    };
  },
  applyEntry(state, incomingEntry, op) {
    // This is called to apply a history entry to the state (i.e. undo/redo)
    return outgoingEntry;
  },
});
```

### `onCreate` (optional)

This callback is called when the adapter is created. It receives the configuration object if provided.

This is used by `createPatchHistoryAdapter` to enable patches in Immer.

```js
const onCreate = () => {
  enablePatches();
};
```

### `getInitialState` (optional)

If you want to manage more properties than in the default state, you can provide a function that returns the initial state.

```js
const getCustomInitialState = (data) => {
  return {
    ...getInitialState(data),
    extra: "extra",
  };
};
```

### `wrapRecipe`

This callback receives a recipe that operates on the state should return a function that receives the entire history state shape, updates it, and returns a history entry to be added to the past stack.

For example, the `createHistoryAdapter` does a simple write to `state.present` and returns the previous state as the history entry.

```js
const wrapRecipe = (recipe) => {
  return (state, ...args) => {
    // get the non-proxy version, so we can return it as the history entry
    const previousState = ensureCurrent(state.present);
    // slightly simplified - recipe return behaviour matchers immer
    state.present = recipe(state.present, ...args);
    return previousState;
  };
};
```

The `createPatchHistoryAdapter` uses Immer's patches to generate a history entry.

```js
const wrapRecipe = (recipe) => {
  return (state, ...args) => {
    const [{ present }, redo, undo] = produceWithPatches(state, (draft) => {
      // slightly simplified - recipe return behaviour matchers immer
      state.present = recipe(draft, ...args);
    });
    state.present = present;

    return { undo, redo };
  };
};
```

### `applyEntry`

This callback receives the current state, an incoming entry, and an operation (either `undo` or `redo`). It should return the outgoing entry.

In the context of an undo operation, the incoming entry is the last entry in the past stack, and the outgoing entry is the first entry in the future stack. In the context of a redo operation, the incoming entry is the first entry in the future stack, and the outgoing entry is the last entry in the past stack.

For example, the `createHistoryAdapter` simply swaps the present state with the incoming entry.

```js
const applyEntry = (state, incomingEntry, op) => {
  const outgoingEntry = state.present;
  state.present = incomingEntry;
  return outgoingEntry;
};
```

The `createPatchHistoryAdapter` uses Immer's `applyPatches` to apply the patches to the state, and returns the incoming entry.

```js
const applyEntry = (state, incomingEntry, op) => {
  applyPatches(state.present, incomingEntry[op]);
  return incomingEntry;
};
```

## Typescript

Because the returned `createCustomHistoryAdapter` function is generic, the Typescript needs to be able to act like higher kinded types.

Inspired by [HOTScript](https://github.com/gvergnaud/hotscript), this is achieved using an extensible interface.

```ts
export interface BaseHistoryStateFn {
  data: unknown;
  state: BaseHistoryState<this["data"], unknown>;
  config: BaseHistoryAdapterConfig;
}
```

In order to describe your custom state shape and/or configuration, you should create an extended version of this interface, using `this["data"]` to retrieve the data type.

```ts
interface CustomHistoryState<Data> extends BaseHistoryState<Data, CustomEntry> {
  extra: string;
}

interface CustomConfig extends BaseHistoryAdapterConfig {
  extraConfig?: string;
}

// highlight-start
interface CustomHistoryStateFn extends BaseHistoryStateFn {
  state: CustomHistoryState<this["data"]>;
  config: CustomConfig;
}
// highlight-end
```

You can then provide this interface to `buildCreateHistoryAdapter`, and all types should infer correctly.

```ts
const createCustomHistoryAdapter =
  buildCreateHistoryAdapter<CustomHistoryStateFn>({
    onCreate(config) {
      console.log(config?.extraConfig); // works
    },
    // is required if the default state is not enough
    getInitialState(data) {
      return {
        ...getInitialState(data),
        extra: "extra",
      };
    },
    wrapRecipe(recipe) {
      // This is called when a recipe is created
      return (state, ...args) => {
        // State is a Draft<CustomHistoryState<Data>>

        return entry; // required to be a CustomEntry
      };
    },
    applyEntry(state, incomingEntry, op) {
      // State is a Draft<CustomHistoryState<unknown>>
      // Incoming entry is a CustomEntry

      return outgoingEntry; // required to be a CustomEntry
    },
  });

const exampleAdapter = createCustomHistoryAdapter<CounterState>({
  extraConfig: "foo",
});
// "foo" logged to console

const initialState = exampleAdapter.getInitialState({ count: 0 });
//    ^? CustomHistoryState<CounterState>
```

:::tip Constraining the Data Type

If your custom adapter is only meant to work with a specific data type, you can constrain the `Data` type in the `CustomHistoryStateFn` interface.

```ts
interface CustomHistoryStateFn extends BaseHistoryStateFn {
  data: Record<string, unknown>;
  state: CustomHistoryState<Data>;
  config: CustomConfig;
}
```

This will be used to constrain the `Data` type in the `createCustomHistoryAdapter` function.

```ts
const createCustomHistoryAdapter =
  //    ^? <Data extends Record<string, unknown>>(config: CustomHistoryAdapterConfig<Data>) => HistoryAdapter<Data, CustomHistoryState<Data>>
  buildCreateHistoryAdapter<CustomHistoryStateFn>({
    // ...
  });

// now errors
const exampleAdapter = createCustomHistoryAdapter<number>();
```

:::
