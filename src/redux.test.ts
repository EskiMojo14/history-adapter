import {
  buildCreateSlice,
  combineSlices,
  configureStore,
  createSlice,
} from "@reduxjs/toolkit";
import {
  createReduxHistoryAdapter,
  historyMethodsCreator,
  undoableCreator,
} from "./redux";
import { describe, expect, it, beforeEach } from "vitest";

interface Book {
  title: string;
  author: string;
}
const bookHistoryAdapter = createReduxHistoryAdapter<Book>();
const book: Book = {
  title: "Hitchhiker's Guide to the Galaxy",
  author: "Douglas Adams",
};
const newTitle = "The Restaurant at the End of the Universe";

describe("createReduxHistoryAdapter", () => {
  const bookHistorySlice = createSlice({
    name: "book",
    initialState: bookHistoryAdapter.getInitialState(book),
    reducers: (create) => ({
      undo: create.reducer(bookHistoryAdapter.undo),
      redo: create.reducer(bookHistoryAdapter.redo),
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

  const { undo, redo, updateTitle } = bookHistorySlice.actions;
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
  });

  it("can derive undoable from action", () => {
    expect(selectTitle(store.getState())).toBe(book.title);

    store.dispatch(updateTitle(newTitle, false));

    expect(selectTitle(store.getState())).toBe(newTitle);

    store.dispatch(undo());

    expect(selectTitle(store.getState())).toBe(newTitle);
  });
});

describe("Slice creators", () => {
  const createAppSlice = buildCreateSlice({
    creators: {
      historyMethods: historyMethodsCreator,
      undoable: undoableCreator,
    },
  });
  it("adds creators for reuse with slices", () => {
    const bookSlice = createAppSlice({
      name: "book",
      initialState: bookHistoryAdapter.getInitialState(book),
      reducers: (create) => ({
        ...create.historyMethods(),
        changeTitle: create.preparedReducer(
          create.undoable.withPayload<string>(),
          create.undoable((state, action) => {
            state.title = action.payload;
          }),
        ),
        exclaimTitle: create.preparedReducer(
          create.undoable.withoutPayload(),
          create.undoable((state) => {
            state.title += "!";
          }),
        ),
      }),
      selectors: {
        selectTitle: (state) => state.present.title,
      },
    });
    const {
      actions: { undo, redo, changeTitle, exclaimTitle },
      selectors: { selectTitle },
    } = bookSlice;

    const store = configureStore({ reducer: combineSlices(bookSlice) });

    expect(selectTitle(store.getState())).toBe(book.title);

    store.dispatch(changeTitle(newTitle));

    expect(selectTitle(store.getState())).toBe(newTitle);

    store.dispatch(exclaimTitle());

    expect(selectTitle(store.getState())).toBe(newTitle + "!");

    store.dispatch(undo());

    expect(selectTitle(store.getState())).toBe(newTitle);

    store.dispatch(redo());

    expect(selectTitle(store.getState())).toBe(newTitle + "!");

    store.dispatch(changeTitle(book.title, false));

    expect(selectTitle(store.getState())).toBe(book.title);

    store.dispatch(undo());

    expect(selectTitle(store.getState())).toBe(newTitle);
  });
});
