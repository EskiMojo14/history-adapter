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
    undo: counterAdapter.undo,
    redo: counterAdapter.redo,
    pauseToggled(state) {
      if (state.paused) {
        counterAdapter.resume(state);
      } else {
        counterAdapter.pause(state);
      }
    },
    jump: counterAdapter.jump,
    clearHistory: counterAdapter.clearHistory,
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
  undo,
  redo,
  pauseToggled,
  jump,
  clearHistory,
  reset,
} = counterSlice.actions;

export const { selectCount, selectCanRedo, selectCanUndo, selectPaused } =
  counterSlice.selectors;
