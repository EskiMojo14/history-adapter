import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { createHistoryAdapter } from "history-adapter/redux";

interface CounterState {
  value: number;
}

const counterAdapter = createHistoryAdapter<CounterState>();

const { selectPresent, ...selectors } = counterAdapter.getSelectors();

const initialState = counterAdapter.getInitialState({ value: 0 });

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

export const { selectCount, selectCanRedo, selectCanUndo, selectPaused } =
  counterSlice.selectors;
