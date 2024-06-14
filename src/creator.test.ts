import type { EntityState } from "@reduxjs/toolkit";
import {
  buildCreateSlice,
  combineSlices,
  configureStore,
  createEntityAdapter,
} from "@reduxjs/toolkit";
import { describe, expect, it } from "vitest";
import { historyCreatorsCreator } from "./creator";
import { createHistoryAdapter, createPatchHistoryAdapter } from "./redux";

interface Book {
  id: number;
  title: string;
  author: string;
}

const book1: Book = {
  id: 1,
  title: "Hitchhiker's Guide to the Galaxy",
  author: "Douglas Adams",
};
const book2: Book = {
  id: 2,
  title: "The Restaurant at the End of the Universe",
  author: "Douglas Adams",
};

describe("Slice creators", () => {
  const createAppSlice = buildCreateSlice({
    creators: {
      historyCreators: historyCreatorsCreator,
    },
  });
  const bookAdapter = createHistoryAdapter<Array<Book>>();
  it("adds creators for reuse with slices", () => {
    const bookSlice = createAppSlice({
      name: "book",
      initialState: bookAdapter.getInitialState([]),
      reducers: (create) => {
        const { createUndoable, createHistoryMethods } =
          create.historyCreators(bookAdapter);
        return {
          ...createHistoryMethods(),
          addBook: createUndoable.preparedReducer(
            bookAdapter.withPayload<Book>(),
            (state, action) => {
              state.push(action.payload);
            },
          ),
          removeLastBook: createUndoable.reducer((state) => {
            state.pop();
          }),
        };
      },
      selectors: {
        selectLastBook: (state) => state.present.at(-1),
      },
    });
    const {
      actions: {
        undone,
        redone,
        jumped,
        paused,
        resumed,
        pauseToggled,
        historyCleared,
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

    store.dispatch(undone());

    expect(selectLastBook(store.getState())).toStrictEqual(book1);

    store.dispatch(redone());

    expect(selectLastBook(store.getState())).toBeUndefined();

    store.dispatch(addBook(book2, false));

    expect(selectLastBook(store.getState())).toStrictEqual(book2);

    store.dispatch(undone());

    expect(selectLastBook(store.getState())).toBe(book1);

    store.dispatch(jumped(1));

    expect(selectLastBook(store.getState())).toStrictEqual(book2);

    store.dispatch(historyCleared());

    store.dispatch(undone());

    expect(selectLastBook(store.getState())).toStrictEqual(book2);

    store.dispatch(addBook(book1));

    store.dispatch(reset());

    expect(selectLastBook(store.getState())).toBeUndefined();

    store.dispatch(paused());

    store.dispatch(addBook(book1));

    store.dispatch(resumed());

    store.dispatch(undone());

    expect(selectLastBook(store.getState())).toEqual(book1);

    store.dispatch(pauseToggled());

    store.dispatch(addBook(book2));

    store.dispatch(pauseToggled());

    store.dispatch(undone());

    expect(selectLastBook(store.getState())).toEqual(book2);
  });
  it("works with nested state", () => {
    const bookSlice = createAppSlice({
      name: "book",
      initialState: { books: bookAdapter.getInitialState([]) },
      reducers: (create) => {
        const { createUndoable, createHistoryMethods } = create.historyCreators(
          bookAdapter,
          {
            selectHistoryState: (state) => state.books,
          },
        );
        return {
          ...createHistoryMethods(),
          addBook: createUndoable.preparedReducer(
            bookAdapter.withPayload<Book>(),
            (state, action) => {
              state.push(action.payload);
            },
          ),
          removeLastBook: createUndoable.reducer((state) => {
            state.pop();
          }),
        };
      },
      selectors: {
        selectLastBook: (state) => state.books.present.at(-1),
      },
    });

    const {
      actions: {
        undone,
        redone,
        jumped,
        paused,
        resumed,
        pauseToggled,
        historyCleared,
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

    store.dispatch(undone());

    expect(selectLastBook(store.getState())).toStrictEqual(book1);

    store.dispatch(redone());

    expect(selectLastBook(store.getState())).toBeUndefined();

    store.dispatch(addBook(book2, false));

    expect(selectLastBook(store.getState())).toStrictEqual(book2);

    store.dispatch(undone());

    expect(selectLastBook(store.getState())).toBe(book1);

    store.dispatch(jumped(1));

    expect(selectLastBook(store.getState())).toStrictEqual(book2);

    store.dispatch(historyCleared());

    store.dispatch(undone());

    expect(selectLastBook(store.getState())).toStrictEqual(book2);

    store.dispatch(addBook(book1));

    store.dispatch(reset());

    expect(selectLastBook(store.getState())).toBeUndefined();

    store.dispatch(paused());

    store.dispatch(addBook(book1));

    store.dispatch(resumed());

    expect(selectLastBook(store.getState())).toEqual(book1);

    store.dispatch(pauseToggled());

    store.dispatch(addBook(book2));

    store.dispatch(pauseToggled());

    store.dispatch(undone());

    expect(selectLastBook(store.getState())).toEqual(book2);
  });
  it("can be destructured", () => {
    const bookSlice = createAppSlice({
      name: "book",
      initialState: bookAdapter.getInitialState([]),
      reducers: ({ historyCreators }) => {
        const { createUndoable, createHistoryMethods } =
          historyCreators(bookAdapter);
        const { reducer, preparedReducer } = createUndoable;
        return {
          ...createHistoryMethods(),
          addBook: preparedReducer(
            bookAdapter.withPayload<Book>(),
            (state, action) => {
              state.push(action.payload);
            },
          ),
          removeLastBook: reducer((state) => {
            state.pop();
          }),
        };
      },
      selectors: {
        selectLastBook: (state) => state.present.at(-1),
      },
    });

    const {
      actions: { undone, addBook },
      selectors: { selectLastBook },
    } = bookSlice;

    expect(undone).toBeTypeOf("function");

    const store = configureStore({ reducer: combineSlices(bookSlice) });

    expect(selectLastBook(store.getState())).toBeUndefined();

    store.dispatch(addBook(book1));

    expect(selectLastBook(store.getState())).toStrictEqual(book1);

    store.dispatch(undone());

    expect(selectLastBook(store.getState())).toBeUndefined();
  });
  it("works with patches", () => {
    const bookAdapter = createEntityAdapter<Book>();
    const bookHistoryAdapter =
      createPatchHistoryAdapter<EntityState<Book, Book["id"]>>();
    const localHistorySelectors = bookHistoryAdapter.getSelectors();
    const localSelectors = bookAdapter.getSelectors(
      localHistorySelectors.selectPresent,
    );

    const bookSlice = createAppSlice({
      name: "book",
      initialState: bookHistoryAdapter.getInitialState(
        bookAdapter.getInitialState(),
      ),
      reducers: (create) => {
        const { createUndoable, createHistoryMethods } =
          create.historyCreators(bookHistoryAdapter);
        return {
          ...createHistoryMethods(),
          addBook: createUndoable.preparedReducer(
            bookHistoryAdapter.withPayload<Book>(),
            (state, action) => bookAdapter.setOne(state, action),
          ),
          removeLastBook: createUndoable.reducer((state) => {
            const lastId = state.ids.at(-1);
            if (typeof lastId === "number") {
              bookAdapter.removeOne(state, lastId);
            }
          }),
        };
      },
      selectors: {
        ...localHistorySelectors,
        ...localSelectors,
        selectLastBook: (state) => {
          const lastId = localHistorySelectors.selectPresent(state).ids.at(-1);
          if (typeof lastId === "number") {
            return localSelectors.selectById(state, lastId);
          }
        },
      },
    });

    const {
      actions: { undone, addBook },
      selectors: { selectLastBook },
    } = bookSlice;

    expect(undone).toBeTypeOf("function");
    expect(addBook).toBeTypeOf("function");

    const store = configureStore({ reducer: combineSlices(bookSlice) });

    expect(selectLastBook(store.getState())).toBeUndefined();

    store.dispatch(addBook(book1));

    expect(selectLastBook(store.getState())).toStrictEqual(book1);

    store.dispatch(undone());

    expect(selectLastBook(store.getState())).toBeUndefined();
  });
});
