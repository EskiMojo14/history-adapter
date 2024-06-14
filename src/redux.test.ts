import {
  combineSlices,
  configureStore,
  createSelector,
  createSlice,
} from "@reduxjs/toolkit";
import type { HistoryState } from "./redux";
import { createHistoryAdapter } from "./redux";
import { describe, expect, it, beforeEach, vi } from "vitest";

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

describe("createReduxHistoryAdapter", () => {
  const booksHistoryAdapter = createHistoryAdapter<Array<Book>>();
  const localisedSelectors = booksHistoryAdapter.getSelectors();
  const booksHistorySlice = createSlice({
    name: "books",
    initialState: booksHistoryAdapter.getInitialState([]),
    reducers: (create) => ({
      undone: create.reducer(booksHistoryAdapter.undo),
      redone: create.reducer(booksHistoryAdapter.redo),
      jumped: create.reducer(booksHistoryAdapter.jump),
      paused: create.reducer(booksHistoryAdapter.pause),
      resumed: create.reducer(booksHistoryAdapter.resume),
      historyCleared: create.reducer(booksHistoryAdapter.clearHistory),
      addBook: create.preparedReducer(
        booksHistoryAdapter.withPayload<Book>(),
        booksHistoryAdapter.undoableReducer((state, action) => {
          state.push(action.payload);
        }),
      ),
      removeLastBook: create.preparedReducer(
        booksHistoryAdapter.withoutPayload(),
        booksHistoryAdapter.undoableReducer((state) => {
          state.pop();
        }),
      ),
    }),
    selectors: {
      selectCanUndo: localisedSelectors.selectCanUndo,
      selectCanRedo: localisedSelectors.selectCanRedo,
      selectLastBook: createSelector(
        localisedSelectors.selectPresent,
        (books) => books.at(-1),
      ),
      selectPaused: localisedSelectors.selectPaused,
    },
  });

  const {
    undone,
    redone,
    jumped,
    paused,
    resumed,
    historyCleared,
    addBook,
    removeLastBook,
  } = booksHistorySlice.actions;
  const { selectCanRedo, selectCanUndo, selectLastBook, selectPaused } =
    booksHistorySlice.selectors;

  const reducer = combineSlices(booksHistorySlice);
  let store = configureStore({ reducer });
  beforeEach(() => {
    store = configureStore({ reducer });
  });

  type RootState = ReturnType<typeof reducer>;

  it("can be used as valid case reducers", () => {
    expect(selectLastBook(store.getState())).toBeUndefined();

    store.dispatch(addBook(book1));

    expect(selectLastBook(store.getState())).toStrictEqual(book1);

    expect(selectCanUndo(store.getState())).toBe(true);

    expect(selectCanRedo(store.getState())).toBe(false);

    store.dispatch(undone());

    expect(selectLastBook(store.getState())).toBeUndefined();

    expect(selectCanUndo(store.getState())).toBe(false);

    expect(selectCanRedo(store.getState())).toBe(true);

    store.dispatch(redone());

    expect(selectLastBook(store.getState())).toStrictEqual(book1);

    store.dispatch(addBook(book2));

    expect(selectLastBook(store.getState())).toStrictEqual(book2);

    store.dispatch(jumped(-2));

    expect(selectLastBook(store.getState())).toBe(undefined);

    store.dispatch(jumped(1));

    expect(selectLastBook(store.getState())).toStrictEqual(book1);

    store.dispatch(historyCleared());

    store.dispatch(undone());

    expect(selectLastBook(store.getState())).toStrictEqual(book1);

    store.dispatch(removeLastBook());

    expect(selectLastBook(store.getState())).toBeUndefined();

    store.dispatch(paused());

    expect(selectPaused(store.getState())).toBe(true);

    store.dispatch(resumed());

    expect(selectPaused(store.getState())).toBe(false);
  });

  it("can derive undoable from action", () => {
    expect(selectLastBook(store.getState())).toBeUndefined();

    store.dispatch(addBook(book1, false));

    expect(selectLastBook(store.getState())).toStrictEqual(book1);

    store.dispatch(undone());

    expect(selectLastBook(store.getState())).toStrictEqual(book1);
  });

  it("can work with nested state", () => {
    const nestedSlice = createSlice({
      name: "nested",
      initialState: {
        books: booksHistoryAdapter.getInitialState([]),
      },
      reducers: (create) => ({
        undone: create.reducer((state) => {
          booksHistoryAdapter.undo(state.books);
        }),
        addBook: create.preparedReducer(
          booksHistoryAdapter.withPayload<Book>(),
          booksHistoryAdapter.undoableReducer(
            (state, action) => {
              state.push(action.payload);
            },
            {
              selectHistoryState: (s: { books: HistoryState<Array<Book>> }) =>
                s.books,
            },
          ),
        ),
      }),
      selectors: {
        selectLastBook: (state: RootState) => state.books.present.at(-1),
      },
    });

    const { addBook, undone } = nestedSlice.actions;
    const { selectLastBook } = nestedSlice.selectors;

    const reducer = combineSlices(nestedSlice);

    const store = configureStore({ reducer });

    store.dispatch(addBook(book1));

    expect(selectLastBook(store.getState())).toStrictEqual(book1);

    store.dispatch(undone());

    expect(selectLastBook(store.getState())).toBeUndefined();
  });

  describe("getSelectors", () => {
    it("can be used without an input selector", () => {
      const { selectPresent } = booksHistoryAdapter.getSelectors();
      expect(selectPresent(store.getState().books)).toEqual([]);
    });
    it("can be used with an input selector", () => {
      const { selectPresent } = booksHistoryAdapter.getSelectors(
        (state: RootState) => booksHistorySlice.selectSlice(state),
      );
      expect(selectPresent(store.getState())).toEqual([]);
    });
    it("logs a error when a createSelector function is passed", () => {
      const consoleSpy = vi.spyOn(console, "error");
      booksHistoryAdapter.getSelectors(undefined, { createSelector: () => {} });
      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy.mock.calls[0]?.[0]).toMatchInlineSnapshot(`
        "The createSelector option is no longer supported, as no memoisation is needed.
        This option will be removed in the next major version."
      `);
    });
  });
});
