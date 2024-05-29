import { describe, it, expect } from "vitest";
import type { PatchHistoryState, HistoryState } from ".";
import { createHistoryAdapter, createPatchHistoryAdapter } from ".";
import { nothing, produce } from "immer";

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

describe("createHistoryAdapter", () => {
  const booksHistoryAdapter = createHistoryAdapter<Array<Book>>();

  describe("getInitialState", () => {
    it("returns an initial state", () => {
      expect(booksHistoryAdapter.getInitialState([])).toEqual<
        HistoryState<Array<Book>>
      >({
        past: [],
        present: [],
        future: [],
        paused: false,
      });
    });
  });

  describe("undoable", () => {
    it("wraps a function to automatically update patches", () => {
      const addBook = booksHistoryAdapter.undoable((books, book: Book) => {
        books.push(book);
      });
      const initialState = booksHistoryAdapter.getInitialState([]);
      const nextState = addBook(initialState, book1);
      expect(nextState).toEqual<HistoryState<Array<Book>>>({
        past: [[]],
        present: [book1],
        future: [],
        paused: false,
      });
    });
    it("handles nothing value to return undefined", () => {
      const optionalHistoryAdapter = createHistoryAdapter<string | undefined>();
      const clearValue = optionalHistoryAdapter.undoable(() => nothing);
      expect(clearValue(optionalHistoryAdapter.getInitialState("foo"))).toEqual<
        HistoryState<string | undefined>
      >({
        past: ["foo"],
        present: undefined,
        future: [],
        paused: false,
      });
    });
    it("allows deriving from arguments whether update should be undoable", () => {
      const addBook = booksHistoryAdapter.undoable(
        (books, book: Book, undoable?: boolean) => {
          books.push(book);
        },
        (book, undoable) => undoable,
      );
      const initialState = booksHistoryAdapter.getInitialState([]);
      const nextState = addBook(initialState, book1, false);
      expect(nextState).toEqual<HistoryState<Array<Book>>>({
        past: [],
        present: [book1],
        future: [],
        paused: false,
      });
    });
    it("can be used as a mutator if already working with drafts", () => {
      const addBook = booksHistoryAdapter.undoable((books, book: Book) => {
        books.push(book);
      });
      const initialState = booksHistoryAdapter.getInitialState([]);
      const nextState = produce(initialState, (draft) => {
        addBook(draft, book1);
      });
      expect(nextState).toEqual<HistoryState<Array<Book>>>({
        past: [[]],
        present: [book1],
        future: [],
        paused: false,
      });
    });
    it("can be provided with a selector if working with nested state", () => {
      const addBook = booksHistoryAdapter.undoable(
        (books, book: Book) => {
          books.push(book);
        },
        {
          selectHistoryState: (state: { books: HistoryState<Array<Book>> }) =>
            state.books,
        },
      );
      const initialState = { books: booksHistoryAdapter.getInitialState([]) };

      const nextState = addBook(initialState, book1);

      expect(nextState).toEqual({
        books: {
          past: [[]],
          present: [book1],
          future: [],
          paused: false,
        },
      });
    });
  });
  describe("undo", () => {
    const initialState = booksHistoryAdapter.getInitialState([]);
    const addBook = booksHistoryAdapter.undoable((books, book: Book) => {
      books.push(book);
    });
    const updatedState = addBook(initialState, book1);
    it("applies previous patch if available", () => {
      expect(booksHistoryAdapter.undo(updatedState)).toEqual<
        HistoryState<Array<Book>>
      >({
        past: [],
        present: [],
        future: [[book1]],
        paused: false,
      });
    });
    it("can be used as a mutator if already working with drafts", () => {
      expect(
        produce(updatedState, (draft) => {
          booksHistoryAdapter.undo(draft);
        }),
      ).toEqual<HistoryState<Array<Book>>>({
        past: [],
        present: [],
        future: [[book1]],
        paused: false,
      });
    });
  });

  describe("redo", () => {
    const initialState = booksHistoryAdapter.getInitialState([]);
    const addBook = booksHistoryAdapter.undoable((books, book: Book) => {
      books.push(book);
    });
    const updatedState = addBook(initialState, book1);
    const undoneState = booksHistoryAdapter.undo(updatedState);

    it("applies next patch if available", () => {
      expect(booksHistoryAdapter.redo(undoneState)).toEqual<
        HistoryState<Array<Book>>
      >({
        past: [[]],
        present: [book1],
        future: [],
        paused: false,
      });
    });
    it("can be used as a mutator if already working with drafts", () => {
      expect(
        produce(undoneState, (draft) => {
          booksHistoryAdapter.redo(draft);
        }),
      ).toEqual<HistoryState<Array<Book>>>({
        past: [[]],
        present: [book1],
        future: [],
        paused: false,
      });
    });
  });

  describe("jump", () => {
    const initialState = booksHistoryAdapter.getInitialState([]);
    const addBook = booksHistoryAdapter.undoable((books, book: Book) => {
      books.push(book);
    });
    const updatedState = addBook(initialState, book1);
    const secondState = addBook(updatedState, book2);

    it("moves the state back or forward in history by n steps", () => {
      const jumpedState = booksHistoryAdapter.jump(secondState, -2);
      expect(jumpedState).toEqual<HistoryState<Array<Book>>>({
        past: [],
        present: [],
        future: [[book1], [book1, book2]],
        paused: false,
      });
      const jumpedForwardState = booksHistoryAdapter.jump(jumpedState, 2);
      expect(jumpedForwardState).toEqual(secondState);
    });
    it("can be used as a mutator if already working with drafts", () => {
      expect(
        produce(secondState, (draft) => {
          booksHistoryAdapter.jump(draft, -2);
        }),
      ).toEqual<HistoryState<Array<Book>>>({
        past: [],
        present: [],
        future: [[book1], [book1, book2]],
        paused: false,
      });
    });
  });

  describe("pause", () => {
    it("can be used to pause history tracking", () => {
      const initialState = booksHistoryAdapter.getInitialState([]);
      const pausedState = booksHistoryAdapter.pause(initialState);
      expect(pausedState).toEqual<HistoryState<Array<Book>>>({
        past: [],
        present: [],
        future: [],
        paused: true,
      });
    });
    it("can be used as a mutator if already working with drafts", () => {
      const initialState = booksHistoryAdapter.getInitialState([]);
      expect(
        produce(initialState, (draft) => {
          booksHistoryAdapter.pause(draft);
        }),
      ).toEqual<HistoryState<Array<Book>>>({
        past: [],
        present: [],
        future: [],
        paused: true,
      });
    });
    it("is respected by undoable functions", () => {
      const addBook = booksHistoryAdapter.undoable((books, book: Book) => {
        books.push(book);
      });
      const initialState = booksHistoryAdapter.getInitialState([]);
      const pausedState = booksHistoryAdapter.pause(initialState);
      const nextState = addBook(pausedState, book1);
      expect(nextState).toEqual<HistoryState<Array<Book>>>({
        past: [],
        present: [book1],
        future: [],
        paused: true,
      });
    });
  });

  describe("resume", () => {
    it("can be used to resume history tracking", () => {
      const initialState = booksHistoryAdapter.getInitialState([]);
      const pausedState = booksHistoryAdapter.pause(initialState);
      const resumedState = booksHistoryAdapter.resume(pausedState);
      expect(resumedState).toEqual<HistoryState<Array<Book>>>({
        past: [],
        present: [],
        future: [],
        paused: false,
      });
    });
    it("can be used as a mutator if already working with drafts", () => {
      const initialState = booksHistoryAdapter.getInitialState([]);
      const pausedState = booksHistoryAdapter.pause(initialState);
      expect(
        produce(pausedState, (draft) => {
          booksHistoryAdapter.resume(draft);
        }),
      ).toEqual<HistoryState<Array<Book>>>({
        past: [],
        present: [],
        future: [],
        paused: false,
      });
    });
    it("is respected by undoable functions", () => {
      const addBook = booksHistoryAdapter.undoable((books, book: Book) => {
        books.push(book);
      });
      const initialState = booksHistoryAdapter.getInitialState([]);
      const pausedState = booksHistoryAdapter.pause(initialState);
      const withBook = addBook(pausedState, book1);
      expect(withBook).toEqual<HistoryState<Array<Book>>>({
        past: [],
        present: [book1],
        future: [],
        paused: true,
      });

      const resumedState = booksHistoryAdapter.resume(withBook);
      const nextState = addBook(resumedState, book2);
      expect(nextState).toEqual<HistoryState<Array<Book>>>({
        past: [[book1]],
        present: [book1, book2],
        future: [],
        paused: false,
      });
    });
  });

  describe("config", () => {
    it("can limit history size", () => {
      const historyAdapter = createHistoryAdapter<{ value: number }>({
        limit: 2,
      });
      const initialState = historyAdapter.getInitialState({ value: 0 });
      const increment = historyAdapter.undoable((state) => {
        state.value++;
      });

      let currentState = initialState;
      for (let i = 0; i < 5; i++) {
        currentState = increment(currentState);
      }

      expect(currentState.present).toEqual({ value: 5 });
      expect(currentState.past.length).toBe(2);

      currentState = historyAdapter.jump(currentState, -5);

      expect(currentState.present).toEqual({ value: 3 });
    });
  });
});

describe("createPatchHistoryAdapter", () => {
  const booksHistoryAdapter = createPatchHistoryAdapter<Array<Book>>();

  describe("getInitialState", () => {
    it("returns an initial state", () => {
      expect(booksHistoryAdapter.getInitialState([])).toEqual<
        PatchHistoryState<Array<Book>>
      >({
        past: [],
        present: [],
        future: [],
        paused: false,
      });
    });
  });

  const aPatch = expect.objectContaining({
    op: expect.oneOf(["add", "replace", "remove"]),
  });

  const aPatchState = {
    redo: expect.iterableOf(aPatch),
    undo: expect.iterableOf(aPatch),
  };

  describe("undoable", () => {
    it("wraps a function to automatically update patches", () => {
      const addBook = booksHistoryAdapter.undoable((books, book: Book) => {
        books.push(book);
      });
      const initialState = booksHistoryAdapter.getInitialState([]);
      const nextState = addBook(initialState, book1);
      expect(nextState).toEqual<PatchHistoryState<Array<Book>>>({
        past: [aPatchState],
        present: [book1],
        future: [],
        paused: false,
      });
    });
    it("handles nothing value to return undefined", () => {
      const optionalHistoryAdapter = createPatchHistoryAdapter<
        string | undefined
      >();
      const clearValue = optionalHistoryAdapter.undoable(() => nothing);
      expect(clearValue(optionalHistoryAdapter.getInitialState("foo"))).toEqual<
        PatchHistoryState<string | undefined>
      >({
        past: [aPatchState],
        present: undefined,
        future: [],
        paused: false,
      });
    });
    it("allows deriving from arguments whether update should be undoable", () => {
      const addBook = booksHistoryAdapter.undoable(
        (books, book: Book, undoable?: boolean) => {
          books.push(book);
        },
        (book, undoable) => undoable,
      );
      const initialState = booksHistoryAdapter.getInitialState([]);
      const nextState = addBook(initialState, book1, false);
      expect(nextState).toEqual<PatchHistoryState<Array<Book>>>({
        past: [],
        present: [book1],
        future: [],
        paused: false,
      });
    });
    it("can be used as a mutator if already working with drafts", () => {
      const addBook = booksHistoryAdapter.undoable((books, book: Book) => {
        books.push(book);
      });
      const initialState = booksHistoryAdapter.getInitialState([]);
      const nextState = produce(initialState, (draft) => {
        addBook(draft, book1);
      });
      expect(nextState).toEqual<PatchHistoryState<Array<Book>>>({
        past: [aPatchState],
        present: [book1],
        future: [],
        paused: false,
      });
    });
    it("can be provided with a selector if working with nested state", () => {
      const addBook = booksHistoryAdapter.undoable(
        (books, book: Book) => {
          books.push(book);
        },
        {
          selectHistoryState: (state: {
            books: PatchHistoryState<Array<Book>>;
          }) => state.books,
        },
      );
      const initialState = { books: booksHistoryAdapter.getInitialState([]) };

      const nextState = addBook(initialState, book1);

      expect(nextState).toEqual({
        books: {
          past: [aPatchState],
          present: [book1],
          future: [],
          paused: false,
        },
      });
    });
  });
  describe("undo", () => {
    const initialState = booksHistoryAdapter.getInitialState([]);
    const addBook = booksHistoryAdapter.undoable((books, book: Book) => {
      books.push(book);
    });
    const updatedState = addBook(initialState, book1);
    it("applies previous patch if available", () => {
      expect(booksHistoryAdapter.undo(updatedState)).toEqual<
        PatchHistoryState<Array<Book>>
      >({
        past: [],
        present: [],
        future: [aPatchState],
        paused: false,
      });
    });
    it("can be used as a mutator if already working with drafts", () => {
      expect(
        produce(updatedState, (draft) => {
          booksHistoryAdapter.undo(draft);
        }),
      ).toEqual<PatchHistoryState<Array<Book>>>({
        past: [],
        present: [],
        future: [aPatchState],
        paused: false,
      });
    });
  });
  describe("redo", () => {
    const initialState = booksHistoryAdapter.getInitialState([]);
    const addBook = booksHistoryAdapter.undoable((books, book: Book) => {
      books.push(book);
    });
    const updatedState = addBook(initialState, book1);
    const undoneState = booksHistoryAdapter.undo(updatedState);

    it("applies next patch if available", () => {
      expect(booksHistoryAdapter.redo(undoneState)).toEqual<
        PatchHistoryState<Array<Book>>
      >({
        past: [aPatchState],
        present: [book1],
        future: [],
        paused: false,
      });
    });
    it("can be used as a mutator if already working with drafts", () => {
      expect(
        produce(undoneState, (draft) => {
          booksHistoryAdapter.redo(draft);
        }),
      ).toEqual<PatchHistoryState<Array<Book>>>({
        past: [aPatchState],
        present: [book1],
        future: [],
        paused: false,
      });
    });
  });
  describe("jump", () => {
    const initialState = booksHistoryAdapter.getInitialState([]);
    const addBook = booksHistoryAdapter.undoable((books, book: Book) => {
      books.push(book);
    });
    const updatedState = addBook(initialState, book1);
    const secondState = addBook(updatedState, book2);

    it("moves the state back or forward in history by n steps", () => {
      const jumpedState = booksHistoryAdapter.jump(secondState, -2);
      expect(jumpedState).toEqual<PatchHistoryState<Array<Book>>>({
        past: [],
        present: [],
        future: [aPatchState, aPatchState],
        paused: false,
      });
      const jumpedForwardState = booksHistoryAdapter.jump(jumpedState, 2);
      expect(jumpedForwardState).toEqual(secondState);
    });
    it("can be used as a mutator if already working with drafts", () => {
      expect(
        produce(secondState, (draft) => {
          booksHistoryAdapter.jump(draft, -2);
        }),
      ).toEqual<PatchHistoryState<Array<Book>>>({
        past: [],
        present: [],
        future: [aPatchState, aPatchState],
        paused: false,
      });
    });
  });
  describe("pause", () => {
    it("can be used to pause history tracking", () => {
      const initialState = booksHistoryAdapter.getInitialState([]);
      const pausedState = booksHistoryAdapter.pause(initialState);
      expect(pausedState).toEqual<PatchHistoryState<Array<Book>>>({
        past: [],
        present: [],
        future: [],
        paused: true,
      });
    });
    it("can be used as a mutator if already working with drafts", () => {
      const initialState = booksHistoryAdapter.getInitialState([]);
      expect(
        produce(initialState, (draft) => {
          booksHistoryAdapter.pause(draft);
        }),
      ).toEqual<PatchHistoryState<Array<Book>>>({
        past: [],
        present: [],
        future: [],
        paused: true,
      });
    });
    it("is respected by undoable functions", () => {
      const addBook = booksHistoryAdapter.undoable((books, book: Book) => {
        books.push(book);
      });
      const initialState = booksHistoryAdapter.getInitialState([]);
      const pausedState = booksHistoryAdapter.pause(initialState);
      const nextState = addBook(pausedState, book1);
      expect(nextState).toEqual<PatchHistoryState<Array<Book>>>({
        past: [],
        present: [book1],
        future: [],
        paused: true,
      });
    });
  });
  describe("resume", () => {
    it("can be used to resume history tracking", () => {
      const initialState = booksHistoryAdapter.getInitialState([]);
      const pausedState = booksHistoryAdapter.pause(initialState);
      const resumedState = booksHistoryAdapter.resume(pausedState);
      expect(resumedState).toEqual<PatchHistoryState<Array<Book>>>({
        past: [],
        present: [],
        future: [],
        paused: false,
      });
    });
    it("can be used as a mutator if already working with drafts", () => {
      const initialState = booksHistoryAdapter.getInitialState([]);
      const pausedState = booksHistoryAdapter.pause(initialState);
      expect(
        produce(pausedState, (draft) => {
          booksHistoryAdapter.resume(draft);
        }),
      ).toEqual<PatchHistoryState<Array<Book>>>({
        past: [],
        present: [],
        future: [],
        paused: false,
      });
    });
    it("is respected by undoable functions", () => {
      const addBook = booksHistoryAdapter.undoable((books, book: Book) => {
        books.push(book);
      });
      const initialState = booksHistoryAdapter.getInitialState([]);
      const pausedState = booksHistoryAdapter.pause(initialState);
      const withBook = addBook(pausedState, book1);
      expect(withBook).toEqual<PatchHistoryState<Array<Book>>>({
        past: [],
        present: [book1],
        future: [],
        paused: true,
      });

      const resumedState = booksHistoryAdapter.resume(withBook);
      const nextState = addBook(resumedState, book2);
      expect(nextState).toEqual<PatchHistoryState<Array<Book>>>({
        past: [aPatchState],
        present: [book1, book2],
        future: [],
        paused: false,
      });
    });
  });
  describe("config", () => {
    it("can limit history size", () => {
      const historyAdapter = createPatchHistoryAdapter<{ value: number }>({
        limit: 2,
      });
      const initialState = historyAdapter.getInitialState({ value: 0 });
      const increment = historyAdapter.undoable((state) => {
        state.value++;
      });

      let currentState = initialState;
      for (let i = 0; i < 5; i++) {
        currentState = increment(currentState);
      }

      expect(currentState.present).toEqual({ value: 5 });
      expect(currentState.past.length).toBe(2);

      currentState = historyAdapter.jump(currentState, -5);

      expect(currentState.present).toEqual({ value: 3 });
    });
  });
});
