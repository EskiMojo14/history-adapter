// will work once RTK supports custom creators
import { buildCreateSlice, asyncThunkCreator } from "@reduxjs/toolkit";
import { HistoryState, createHistoryAdapter } from "history-adapter/redux";
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

interface RootCounterState extends HistoryState<CounterState> {
  incrementing?: boolean;
}

const counterAdapter = createHistoryAdapter<CounterState>();

const { selectPresent, ...selectors } = counterAdapter.getSelectors();

const initialState: RootCounterState = counterAdapter.getInitialState({
  value: 0,
});

export const counterSlice = createAppSlice({
  name: "counter",
  initialState,
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
          pending(state) {
            state.incrementing = true;
          },
          fulfilled: createUndoable.reducer<number>((state, action) => {
            state.value += action.payload;
          }),
          settled(state) {
            delete state.incrementing;
          },
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
