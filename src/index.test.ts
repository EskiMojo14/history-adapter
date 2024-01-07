import { describe, it, expect } from "vitest";
import { HistoryState, createHistoryAdapter } from ".";
import { nothing } from "immer";

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
      const newTitle = "The Restaurant at the End of the Universe";
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
        (newTitle, undoable = true) => undoable,
      );
      const initialState = bookHistoryAdapter.getInitialState(book);
      const newTitle = "The Restaurant at the End of the Universe";
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
      const updatedState = updateTitle(
        initialState,
        "The Restaurant at the End of the Universe",
      );

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
      const newTitle = "The Restaurant at the End of the Universe";
      const updatedState = updateTitle(initialState, newTitle);
      const undoneState = bookHistoryAdapter.undo(updatedState);

      expect(bookHistoryAdapter.redo(undoneState)).toEqual<HistoryState<Book>>({
        past: [aPatchState],
        present: { ...book, title: newTitle },
        future: [],
      });
    });
  });
});
