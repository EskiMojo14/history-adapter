import {
  buildCreateSlice,
  combineSlices,
  configureStore,
} from "@reduxjs/toolkit";
import { describe, expect, it } from "vitest";
import { getInitialState } from "..";
import { historyMethodsCreator, undoableCreator } from "./creator";

interface Book {
  title: string;
  author: string;
}
const book: Book = {
  title: "Hitchhiker's Guide to the Galaxy",
  author: "Douglas Adams",
};
const newTitle = "The Restaurant at the End of the Universe";

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
      initialState: getInitialState(book),
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
      actions: { undo, redo, reset, changeTitle, exclaimTitle },
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

    store.dispatch(reset());

    expect(selectTitle(store.getState())).toBe(book.title);
  });
});
