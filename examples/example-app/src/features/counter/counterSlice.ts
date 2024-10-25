import { PayloadAction, createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { HistoryState, createHistoryAdapter } from "history-adapter/redux";

interface CounterState {
  value: number;
}

interface RootCounterState extends HistoryState<CounterState> {
  incrementing?: boolean;
}

export const incrementAsync = createAsyncThunk(
  "counter/incrementAsync",
  async (amount: number) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return amount;
  },
);

const counterAdapter = createHistoryAdapter<CounterState>();

const { selectPresent, ...selectors } = counterAdapter.getSelectors();

const initialState: RootCounterState = {
  ...counterAdapter.getInitialState({ value: 0 }),
  incrementing: false,
};

export const counterSlice = createSlice({
  name: "counter",
  initialState,
  reducers: {
    incremented: counterAdapter.undoableReducer(
      (state, action: PayloadAction<number>) => {
        state.value += action.payload;
      },
    ),
    decremented: counterAdapter.undoableReducer(
      (state, action: PayloadAction<number>) => {
        state.value -= action.payload;
      },
    ),
    undone: counterAdapter.undo,
    redone: counterAdapter.redo,
    pauseToggled(state) {
      state.paused = !state.paused;
    },
    jumped: counterAdapter.jump,
    historyCleared: counterAdapter.clearHistory,
    reset: () => initialState,
  },
  selectors: {
    ...selectors,
    selectCount: (state) => selectPresent(state).value,
    selectIncrementing: (state) => state.incrementing,
  },
  extraReducers: (builder) => {
    builder.addCase(incrementAsync.pending, (state) => {
      state.incrementing = true;
    });
    builder.addCase(
      incrementAsync.fulfilled,
      counterAdapter.undoableReducer<
        ReturnType<typeof incrementAsync.fulfilled> & {
          meta: { undoable?: never };
        }
      >((state, action: ReturnType<typeof incrementAsync.fulfilled>) => {
        state.value += action.payload;
      }),
    );
    builder.addMatcher(incrementAsync.settled, (state) => {
      delete state.incrementing;
    });
  },
});

export const {
  incremented,
  decremented,
  undone,
  redone,
  pauseToggled,
  jumped,
  historyCleared,
  reset,
} = counterSlice.actions;

export const {
  selectCount,
  selectCanRedo,
  selectCanUndo,
  selectPaused,
  selectIncrementing,
} = counterSlice.selectors;
