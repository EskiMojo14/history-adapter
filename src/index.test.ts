import { describe, it, expect, beforeEach } from "vitest";
import { HistoryState, createHistoryAdapter } from ".";
import { nothing } from "immer";
import { combineSlices, configureStore, createSlice } from "@reduxjs/toolkit";

describe("createHistoryAdapter", () => {
  const numberHistoryAdapter = createHistoryAdapter<number>();

  interface Book {
    title: string;
    author: string;
  }
  const bookHistoryAdapter = createHistoryAdapter<Book>();
  const book: Book = {
    title: "Hitchhiker's Guide to the Galaxy",
    author: "Douglas Adams",
  };
  const newTitle = "The Restaurant at the End of the Universe";

  const optionalHistoryAdapter = createHistoryAdapter<string | undefined>();
  describe("getInitialState", () => {
    it("returns an initial state", () => {
      expect(bookHistoryAdapter.getInitialState(book)).toEqual<
        HistoryState<Book>
      >({
        past: [],
        present: book,
        future: [],
      });
    });
    it("works with non-draftable state", () => {
      expect(numberHistoryAdapter.getInitialState(1)).toEqual<
        HistoryState<number>
      >({
        past: [],
        present: 1,
        future: [],
      });
    });
  });

  const aPatchState = {
    redo: expect.any(Array),
    undo: expect.any(Array),
  };

  describe("undoable", () => {
    it("wraps a function to automatically update patches", () => {
      const changeTitle = bookHistoryAdapter.undoable(
        (book, newTitle: string) => {
          book.title = newTitle;
        },
      );
      const initialState = bookHistoryAdapter.getInitialState(book);
      const nextState = changeTitle(initialState, newTitle);
      expect(nextState).toEqual<HistoryState<Book>>({
        past: [aPatchState],
        present: { ...book, title: newTitle },
        future: [],
      });
    });
    it("works with undraftable values", () => {
      const increment = numberHistoryAdapter.undoable((state) => state + 1);
      expect(increment(numberHistoryAdapter.getInitialState(1))).toEqual<
        HistoryState<number>
      >({
        past: [aPatchState],
        present: 2,
        future: [],
      });
    });
    it("handles nothing value to return undefined", () => {
      const clearValue = optionalHistoryAdapter.undoable(() => nothing);
      expect(clearValue(optionalHistoryAdapter.getInitialState("foo"))).toEqual<
        HistoryState<string | undefined>
      >({
        past: [aPatchState],
        present: undefined,
        future: [],
      });
    });
    it("allows deriving from arguments whether update should be undoable", () => {
      const updateTitle = bookHistoryAdapter.undoable(
        (book, newTitle: string, undoable?: boolean) => {
          book.title = newTitle;
        },
        (newTitle, undoable) => undoable,
      );
      const initialState = bookHistoryAdapter.getInitialState(book);
      const nextState = updateTitle(initialState, newTitle, false);
      expect(nextState).toEqual<HistoryState<Book>>({
        past: [],
        present: { ...book, title: newTitle },
        future: [],
      });
    });
  });
  describe("undo", () => {
    it("applies previous patch if available", () => {
      const initialState = bookHistoryAdapter.getInitialState(book);
      const updateTitle = bookHistoryAdapter.undoable(
        (book, newTitle: string) => {
          book.title = newTitle;
        },
      );
      const updatedState = updateTitle(initialState, newTitle);

      expect(bookHistoryAdapter.undo(updatedState)).toEqual<HistoryState<Book>>(
        {
          past: [],
          present: book,
          future: [aPatchState],
        },
      );
    });
  });
  describe("redo", () => {
    it("applies next patch if available", () => {
      const initialState = bookHistoryAdapter.getInitialState(book);
      const updateTitle = bookHistoryAdapter.undoable(
        (book, newTitle: string) => {
          book.title = newTitle;
        },
      );
      const updatedState = updateTitle(initialState, newTitle);
      const undoneState = bookHistoryAdapter.undo(updatedState);

      expect(bookHistoryAdapter.redo(undoneState)).toEqual<HistoryState<Book>>({
        past: [aPatchState],
        present: { ...book, title: newTitle },
        future: [],
      });
    });
  });

  describe("in combination with RTK", () => {
    interface UndoableMeta {
      undoable?: boolean;
    }
    const reduxUtils = {
      prepareWithPayload:
        <P>() =>
        (payload: P, undoable?: boolean) => ({ payload, meta: { undoable } }),
      prepareWithoutPayload: () => (undoable?: boolean) => ({
        payload: undefined,
        meta: { undoable },
      }),
      getUndoableMeta: (action: { meta?: UndoableMeta }) =>
        action.meta?.undoable,
    };
    const bookHistorySlice = createSlice({
      name: "book",
      initialState: bookHistoryAdapter.getInitialState(book),
      reducers: (create) => ({
        undo: create.reducer(bookHistoryAdapter.undo),
        redo: create.reducer(bookHistoryAdapter.redo),
        updateTitle: create.preparedReducer(
          reduxUtils.prepareWithPayload<string>(),
          bookHistoryAdapter.undoable((state, action) => {
            state.title = action.payload;
          }, reduxUtils.getUndoableMeta),
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
});
