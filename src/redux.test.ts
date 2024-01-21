import { combineSlices, configureStore, createSlice } from "@reduxjs/toolkit";
import { createHistoryAdapter } from "./redux";
import { describe, expect, it, beforeEach } from "vitest";

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
  const bookHistorySlice = createSlice({
    name: "book",
    initialState: bookHistoryAdapter.getInitialState(book),
    reducers: (create) => ({
      undo: create.reducer(bookHistoryAdapter.undo),
      redo: create.reducer(bookHistoryAdapter.redo),
      jump: create.reducer(bookHistoryAdapter.jump),
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
      selectTitle: (state) => state.present.title,
    },
  });

  const { undo, redo, jump, updateTitle } = bookHistorySlice.actions;
  const { selectTitle } = bookHistorySlice.selectors;

  const reducer = combineSlices(bookHistorySlice);
  let store = configureStore({ reducer });
  beforeEach(() => {
    store = configureStore({ reducer });
  });

  it("can be used as valid case reducers", () => {
    expect(selectTitle(store.getState())).toBe(book.title);

    store.dispatch(updateTitle(newTitle));

    expect(selectTitle(store.getState())).toBe(newTitle);

    store.dispatch(undo());

    expect(selectTitle(store.getState())).toBe(book.title);

    store.dispatch(redo());

    expect(selectTitle(store.getState())).toBe(newTitle);

    store.dispatch(updateTitle(secondTitle));

    expect(selectTitle(store.getState())).toBe(secondTitle);

    store.dispatch(jump(-2));

    expect(selectTitle(store.getState())).toBe(book.title);

    store.dispatch(jump(1));

    expect(selectTitle(store.getState())).toBe(newTitle);
  });

  it("can derive undoable from action", () => {
    expect(selectTitle(store.getState())).toBe(book.title);

    store.dispatch(updateTitle(newTitle, false));

    expect(selectTitle(store.getState())).toBe(newTitle);

    store.dispatch(undo());

    expect(selectTitle(store.getState())).toBe(newTitle);
  });
});
