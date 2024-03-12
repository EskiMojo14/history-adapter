import {
  buildCreateSlice,
  combineSlices,
  configureStore,
} from "@reduxjs/toolkit";
import { describe, expect, it } from "vitest";
import { historyMethodsCreator, undoableReducersCreator } from "./creator";
import type { HistoryState } from "./redux";
import { createHistoryAdapter } from "./redux";

interface Book {
  title: string;
  author: string;
}

const book1: Book = {
  title: "Hitchhiker's Guide to the Galaxy",
  author: "Douglas Adams",
};
const book2: Book = {
  title: "The Restaurant at the End of the Universe",
  author: "Douglas Adams",
};

describe("Slice creators", () => {
  const createAppSlice = buildCreateSlice({
    creators: {
      historyMethods: historyMethodsCreator,
      undoableReducers: undoableReducersCreator,
    },
  });
  it("adds creators for reuse with slices", () => {
    const bookAdapter = createHistoryAdapter<Array<Book>>();
    const bookSlice = createAppSlice({
      name: "book",
      initialState: bookAdapter.getInitialState([]),
      reducers: (create) => ({
        ...create.historyMethods(bookAdapter),
        ...create.undoableReducers(bookAdapter, (createUndoable) => ({
          addBook: createUndoable.preparedReducer(
            bookAdapter.withPayload<Book>(),
            (state, action) => {
              state.push(action.payload);
            },
          ),
          removeLastBook: createUndoable.reducer((state) => {
            state.pop();
          }),
        })),
      }),
      selectors: {
        selectLastBook: (state) => state.present.at(-1),
      },
    });
    const {
      actions: {
        undo,
        redo,
        jump,
        clearHistory,
        reset,
        addBook,
        removeLastBook,
      },
      selectors: { selectLastBook },
    } = bookSlice;

    const store = configureStore({ reducer: combineSlices(bookSlice) });

    expect(selectLastBook(store.getState())).toBeUndefined();

    store.dispatch(addBook(book1));

    expect(selectLastBook(store.getState())).toStrictEqual(book1);

    store.dispatch(removeLastBook());

    expect(selectLastBook(store.getState())).toBeUndefined();

    store.dispatch(undo());

    expect(selectLastBook(store.getState())).toStrictEqual(book1);

    store.dispatch(redo());

    expect(selectLastBook(store.getState())).toBeUndefined();

    store.dispatch(addBook(book2, false));

    expect(selectLastBook(store.getState())).toStrictEqual(book2);

    store.dispatch(undo());

    expect(selectLastBook(store.getState())).toBe(book2);

    store.dispatch(jump(-1));

    expect(selectLastBook(store.getState())).toStrictEqual(book2);

    store.dispatch(clearHistory());

    store.dispatch(undo());

    expect(selectLastBook(store.getState())).toStrictEqual(book2);

    store.dispatch(addBook(book1));

    store.dispatch(reset());

    expect(selectLastBook(store.getState())).toBeUndefined();
  });
  it("works with nested state", () => {
    const selectHistoryState = (state: { books: HistoryState<Array<Book>> }) =>
      state.books;
    const bookAdapter = createHistoryAdapter<Array<Book>>();
    const bookSlice = createAppSlice({
      name: "book",
      initialState: { books: bookAdapter.getInitialState([]) },
      reducers: (create) => ({
        ...create.historyMethods(bookAdapter, {
          selectHistoryState,
        }),
        ...create.undoableReducers(
          bookAdapter,
          (create) => ({
            addBook: create.preparedReducer(
              bookAdapter.withPayload<Book>(),
              (state, action) => {
                state.push(action.payload);
              },
            ),
            removeLastBook: create.reducer((state) => {
              state.pop();
            }),
          }),
          {
            selectHistoryState,
          },
        ),
      }),
      selectors: {
        selectLastBook: (state) => state.books.present.at(-1),
      },
    });

    const {
      actions: {
        undo,
        redo,
        jump,
        clearHistory,
        reset,
        addBook,
        removeLastBook,
      },
      selectors: { selectLastBook },
    } = bookSlice;

    const store = configureStore({ reducer: combineSlices(bookSlice) });

    expect(selectLastBook(store.getState())).toBeUndefined();

    store.dispatch(addBook(book1));

    expect(selectLastBook(store.getState())).toStrictEqual(book1);

    store.dispatch(removeLastBook());

    expect(selectLastBook(store.getState())).toBeUndefined();

    store.dispatch(undo());

    expect(selectLastBook(store.getState())).toStrictEqual(book1);

    store.dispatch(redo());

    expect(selectLastBook(store.getState())).toBeUndefined();

    store.dispatch(addBook(book2, false));

    expect(selectLastBook(store.getState())).toStrictEqual(book2);

    store.dispatch(undo());

    expect(selectLastBook(store.getState())).toBe(book2);

    store.dispatch(jump(-1));

    expect(selectLastBook(store.getState())).toStrictEqual(book2);

    store.dispatch(clearHistory());

    store.dispatch(undo());

    expect(selectLastBook(store.getState())).toStrictEqual(book2);

    store.dispatch(addBook(book1));

    store.dispatch(reset());

    expect(selectLastBook(store.getState())).toBeUndefined();
  });
});
