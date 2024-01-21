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
const book: Book = {
  title: "Hitchhiker's Guide to the Galaxy",
  author: "Douglas Adams",
};
const newTitle = "The Restaurant at the End of the Universe";
const secondTitle = "Life, the Universe and Everything";

describe("createReduxHistoryAdapter", () => {
  const bookHistoryAdapter = createHistoryAdapter<Book>();
  const localisedSelectors = bookHistoryAdapter.getSelectors();
  const bookHistorySlice = createSlice({
    name: "book",
    initialState: bookHistoryAdapter.getInitialState(book),
    reducers: (create) => ({
      undo: create.reducer(bookHistoryAdapter.undo),
      redo: create.reducer(bookHistoryAdapter.redo),
      jump: create.reducer(bookHistoryAdapter.jump),
      clearHistory: create.reducer(bookHistoryAdapter.clearHistory),
      updateTitle: create.preparedReducer(
        bookHistoryAdapter.withPayload<string>(),
        bookHistoryAdapter.undoableReducer((state, action) => {
          state.title = action.payload;
        }),
      ),
      exclaimTitle: create.preparedReducer(
        bookHistoryAdapter.withoutPayload(),
        bookHistoryAdapter.undoableReducer((state) => {
          state.title += "!";
        }),
      ),
    }),
    selectors: {
      selectCanUndo: localisedSelectors.selectCanUndo,
      selectCanRedo: localisedSelectors.selectCanRedo,
      selectTitle: createSelector(
        localisedSelectors.selectPresent,
        (book) => book.title,
      ),
    },
  });

  const { undo, redo, jump, clearHistory, updateTitle } =
    bookHistorySlice.actions;
  const { selectCanRedo, selectCanUndo, selectTitle } =
    bookHistorySlice.selectors;

  const reducer = combineSlices(bookHistorySlice);
  let store = configureStore({ reducer });
  beforeEach(() => {
    store = configureStore({ reducer });
  });

  type RootState = ReturnType<typeof reducer>;

  it("can be used as valid case reducers", () => {
    expect(selectTitle(store.getState())).toBe(book.title);

    store.dispatch(updateTitle(newTitle));

    expect(selectTitle(store.getState())).toBe(newTitle);

    expect(selectCanUndo(store.getState())).toBe(true);

    expect(selectCanRedo(store.getState())).toBe(false);

    store.dispatch(undo());

    expect(selectTitle(store.getState())).toBe(book.title);

    expect(selectCanUndo(store.getState())).toBe(false);

    expect(selectCanRedo(store.getState())).toBe(true);

    store.dispatch(redo());

    expect(selectTitle(store.getState())).toBe(newTitle);

    store.dispatch(updateTitle(secondTitle));

    expect(selectTitle(store.getState())).toBe(secondTitle);

    store.dispatch(jump(-2));

    expect(selectTitle(store.getState())).toBe(book.title);

    store.dispatch(jump(1));

    expect(selectTitle(store.getState())).toBe(newTitle);

    store.dispatch(clearHistory());

    store.dispatch(undo());

    expect(selectTitle(store.getState())).toBe(newTitle);
  });

  it("can derive undoable from action", () => {
    expect(selectTitle(store.getState())).toBe(book.title);

    store.dispatch(updateTitle(newTitle, false));

    expect(selectTitle(store.getState())).toBe(newTitle);

    store.dispatch(undo());

    expect(selectTitle(store.getState())).toBe(newTitle);
  });

  describe("getSelectors", () => {
    it("can be used with an input selector", () => {
      const { selectPresent } = bookHistoryAdapter.getSelectors(
        (state: RootState) => bookHistorySlice.selectSlice(state),
      );
      expect(selectPresent(store.getState())).toBe(book);
    });
    it("can be used with an input selector and a custom createSelector", () => {
      const createSelector = createSelectorCreator(lruMemoize);
      const spied = vi.fn(createSelector);
      const { selectPresent } = bookHistoryAdapter.getSelectors(
        (state: RootState) => bookHistorySlice.selectSlice(state),
        {
          createSelector: spied as unknown as typeof createSelector,
        },
      );
      expect(selectPresent(store.getState())).toBe(book);
      expect(spied).toHaveBeenCalled();
    });
  });
});
