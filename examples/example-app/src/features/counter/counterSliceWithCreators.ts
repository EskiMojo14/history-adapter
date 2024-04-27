// will work once RTK supports custom creators
import { buildCreateSlice } from "@reduxjs/toolkit";
import { createHistoryAdapter } from "history-adapter/redux";
import {
  historyMethodsCreator,
  undoableCreatorsCreator,
} from "history-adapter/creator";

const createAppSlice = buildCreateSlice({
  creators: {
    historyMethods: historyMethodsCreator,
    undoableCreators: undoableCreatorsCreator,
  },
});

interface CounterState {
  value: number;
}

const counterAdapter = createHistoryAdapter<CounterState>();

const { selectPresent, ...selectors } = counterAdapter.getSelectors();

export const counterSlice = createAppSlice({
  name: "counter",
  initialState: counterAdapter.getInitialState({ value: 0 }),
  reducers: (create) => {
    const createUndoable = create.undoableCreators(counterAdapter);
    return {
      incremented: createUndoable.reducer<number>((state, action) => {
        state.value += action.payload;
      }),
      decremented: createUndoable.reducer<number>((state, action) => {
        state.value -= action.payload;
      }),
      ...create.historyMethods(counterAdapter),
    };
  },
  selectors: {
    ...selectors,
    selectCount: (state) => selectPresent(state).value,
  },
});
