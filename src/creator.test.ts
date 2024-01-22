import {
  buildCreateSlice,
  combineSlices,
  configureStore,
} from "@reduxjs/toolkit";
import { describe, expect, it } from "vitest";
import { getInitialState } from ".";
import { historyMethodsCreator, undoableCreator } from "./creator";

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
      undoable: undoableCreator,
    },
  });
  it("adds creators for reuse with slices", () => {
    const bookSlice = createAppSlice({
      name: "book",
      initialState: getInitialState([] as Array<Book>),
      reducers: (create) => ({
        ...create.historyMethods(),
        addBook: create.preparedReducer(
          create.undoable.withPayload<Book>(),
          create.undoable((state, action) => {
            state.push(action.payload);
          }),
        ),
        removeLastBook: create.preparedReducer(
          create.undoable.withoutPayload(),
          create.undoable((state) => {
            state.pop();
          }),
        ),
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
});
