# History Adapter

A "history adapter" for managing undoable (and redoable) state changes with [immer](https://immerjs.github.io/immer/).

Includes generic methods along with Redux-specific helpers.

## History state

A history state shape looks like:

```ts
export interface PatchState {
  undo: Array<Patch>;
  redo: Array<Patch>;
}

export interface HistoryState<Data> {
  past: Array<PatchState>;
  present: Data;
  future: Array<PatchState>;
}
```

The current data is stored under the `present` key, and changes are stored as collections of JSON Patches (created by immer).

## Configuration

Optionally, `createHistoryAdapter` accepts a configuration object with some of the following options:

```ts
const booksHistoryAdapter = createHistoryAdapter({
  limit: 5,
});
```

### `limit`

Defines a maximum history size.

## Generic helper methods

To access the helper methods, create an adapter instance with a specific data type:

```ts
import { createHistoryAdapter } from "history-adapter";

interface Book {
  id: number;
  title: string;
}

const booksHistoryAdapter = createHistoryAdapter<Array<Book>>();
```

You can then use the methods attached to manage state as required.

### `getInitialState`

This method takes the data as specified during creation, and wraps it in a clean history state shape.

```ts
const initialState = booksHistoryAdapter.getInitialState([]);
//    ^? HistoryState<Array<Book>>
```

_A data-agnostic version of this is exported separately._

```ts
import { getInitialState } from "history-adapter";

const initialState = getInitialState(book);
//    ^? HistoryState<Book>
```

### `undoable`

The `undoable` method wraps an immer recipe which operates on the data type, and returns a function which automatically updates the history state with the changes.

```ts
const addBook = booksHistoryAdapter.undoable((books, book: Book) => {
  books.push(book);
});

const nextState = addBook(initialState, { id: 1, title: "Dune" });

console.log(initialState.present, nextState.present); // [] [{ id: 1, title: "Dune" }]
```

Because immer wraps the values, you can use mutating methods without the original data being affected.

If passed an immer draft, the returned function will act mutably, otherwise it'll act immutably and return a new state.

#### Extracting whether an action is undoable

If wrapped in `undoable`, an action is assumed to be undoable, and its changes will be included in the history.

For finer control over this, an `isUndoable` predicate can be passed as the second argument to `undoable`. It receives the same arguments as the recipe (except the current state) and should return `false` if the action is not undoable. `true` or `undefined` will default to the action being undoable.

```ts
const addBook = booksHistoryAdapter.undoable(
  (books, book: Book, undoable?: boolean) => {
    books.push(book);
  },
  (book, undoable) => undoable,
);
```

### `undo`, `redo`, `jump`

The `undo`, `redo` and `jump` methods use the stored patches to move back/forward in the change history.

```ts
const undoneState = booksHistoryAdapter.undo(nextState);

console.log(undoneState.present); // []

const redoneState = booksHistoryAdapter.redo(undoneState);

console.log(undoneState.present); // [{ id: 1, title: "Dune" }]

// jump(-2) is like calling undo() twice and jump(2) is like calling redo() twice
const jumpedState = booksHistoryAdapter.jump(redoneState, -1);
```

Just like undoable functions, these methods will act mutably when passed an immer draft and immutably otherwise.

## Redux helper methods

If imported from `"history-adapter/redux"`, the history adapter will have additional methods to assist use with Redux, specifically with Redux Toolkit.

### `undoableReducer`

Similar to `undoable`, but only allows for a single `action` argument, and automatically extracts whether an action was undoable from its `action.meta.undoable` value.

```ts
import { createHistoryAdapter } from "history-adapter/redux";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const booksHistoryAdapter = createHistoryAdapter<Books>();

const booksSlice = createSlice({
  name: "books",
  initialState: booksHistoryAdapter.getInitialState([]),
  reducers: {
    addBook: {
      prepare: (book: Book, undoable?: boolean) => ({
        payload: book,
        meta: { undoable },
      }),
      reducer: booksHistoryAdapter.undoableReducer(
        (state, action: PayloadAction<Book>) => {
          state.puah(action.payload);
        },
      ),
    },
  },
});
```

### `withoutPayload`

Creates a [prepare callback](https://redux-toolkit.js.org/api/createAction#using-prepare-callbacks-to-customize-action-contents) which has one optional argument, `undoable`. This ensures it results in `action.meta.undoable` being the correct value for `undoableReducer`.

```ts
const booksSlice = createSlice({
  name: "books",
  initialState: booksHistoryAdapter.getInitialState([]),
  reducers: {
    removeLastBook: {
      prepare: booksHistoryAdapter.withoutPayload(),
      reducer: booksHistoryAdapter.undoableReducer((state) => {
        state.pop();
      }),
    },
  },
});
```

### `withPayload`

Creates a prepare callback which receives two arguments, a specified payload and an optional `undoable` value.

```ts
const booksSlice = createSlice({
  name: "books",
  initialState: booksHistoryAdapter.getInitialState([]),
  reducers: {
    addBook: {
      prepare: booksHistoryAdapter.withPayload<Book>(),
      reducer: booksHistoryAdapter.undoableReducer(
        (state, action: PayloadAction<Book>) => {
          state.puah(action.payload);
        },
      ),
    },
  },
});
```

As a tip, `undo`, `redo` and `jump` are valid reducers when using a Redux history adapter:

```ts
const booksSlice = createSlice({
  name: "books",
  initialState: booksHistoryAdapter.getInitialState([]),
  reducers: {
    undo: booksHistoryAdapter.undo,
    redo: booksHistoryAdapter.redo,
    // the redux specific version of `jump` accepts either a number or an action with a number payload
    jump: booksHistoryAdapter.jump,
    addBook: {
      prepare: booksHistoryAdapter.withPayload<Book>(),
      reducer: booksHistoryAdapter.undoableReducer(
        (state, action: PayloadAction<Book>) => {
          state.puah(action.payload);
        },
      ),
    },
  },
});
```
