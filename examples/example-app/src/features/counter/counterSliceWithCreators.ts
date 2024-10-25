// will work once RTK supports custom creators
import { buildCreateSlice, asyncThunkCreator } from "@reduxjs/toolkit";
import { createHistoryAdapter } from "history-adapter/redux";
import { historyCreatorsCreator } from "history-adapter/creator";

const createAppSlice = buildCreateSlice({
  creators: {
    undoableCreators: historyCreatorsCreator,
    asyncThunk: asyncThunkCreator,
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
    const { createUndoable, createHistoryMethods } =
      create.undoableCreators(counterAdapter);
    return {
      incremented: createUndoable.reducer<number>((state, action) => {
        state.value += action.payload;
      }),
      decremented: createUndoable.reducer<number>((state, action) => {
        state.value -= action.payload;
      }),
      incrementedAsync: create.asyncThunk<number, number>(
        async (amount) => {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return amount;
        },
        {
          fulfilled: createUndoable.reducer<number>((state, action) => {
            state.value += action.payload;
          }),
        },
      ),
      ...createHistoryMethods(),
    };
  },
  selectors: {
    ...selectors,
    selectCount: (state) => selectPresent(state).value,
  },
});
