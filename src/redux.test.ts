import {
  combineSlices,
  configureStore,
  createSelector,
  createSelectorCreator,
  createSlice,
  lruMemoize,
} from "@reduxjs/toolkit";
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
      undo: create.reducer(booksHistoryAdapter.undo),
      redo: create.reducer(booksHistoryAdapter.redo),
      jump: create.reducer(booksHistoryAdapter.jump),
      clearHistory: create.reducer(booksHistoryAdapter.clearHistory),
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
    },
  });

  const { undo, redo, jump, clearHistory, addBook, removeLastBook } =
    booksHistorySlice.actions;
  const { selectCanRedo, selectCanUndo, selectLastBook } =
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

    store.dispatch(undo());

    expect(selectLastBook(store.getState())).toBeUndefined();

    expect(selectCanUndo(store.getState())).toBe(false);

    expect(selectCanRedo(store.getState())).toBe(true);

    store.dispatch(redo());

    expect(selectLastBook(store.getState())).toStrictEqual(book1);

    store.dispatch(addBook(book2));

    expect(selectLastBook(store.getState())).toStrictEqual(book2);

    store.dispatch(jump(-2));

    expect(selectLastBook(store.getState())).toBe(undefined);

    store.dispatch(jump(1));

    expect(selectLastBook(store.getState())).toStrictEqual(book1);

    store.dispatch(clearHistory());

    store.dispatch(undo());

    expect(selectLastBook(store.getState())).toStrictEqual(book1);

    store.dispatch(removeLastBook());

    expect(selectLastBook(store.getState())).toBeUndefined();
  });

  it("can derive undoable from action", () => {
    expect(selectLastBook(store.getState())).toBeUndefined();

    store.dispatch(addBook(book1, false));

    expect(selectLastBook(store.getState())).toStrictEqual(book1);

    store.dispatch(undo());

    expect(selectLastBook(store.getState())).toStrictEqual(book1);
  });

  describe("getSelectors", () => {
    it("can be used with an input selector", () => {
      const { selectPresent } = booksHistoryAdapter.getSelectors(
        (state: RootState) => booksHistorySlice.selectSlice(state),
      );
      expect(selectPresent(store.getState())).toEqual([]);
    });
    it("can be used with an input selector and a custom createSelector", () => {
      const createSelector = createSelectorCreator(lruMemoize);
      const spied = vi.fn(
        createSelector as any,
      ) as unknown as typeof createSelector;
      const { selectPresent } = booksHistoryAdapter.getSelectors(
        (state: RootState) => booksHistorySlice.selectSlice(state),
        {
          createSelector: spied,
        },
      );
      expect(selectPresent(store.getState())).toStrictEqual([]);
      expect(spied).toHaveBeenCalled();
    });
  });
});
