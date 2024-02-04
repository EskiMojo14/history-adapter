import { reducerCreator } from "@reduxjs/toolkit";
import type {
  ReducerNamesOfType,
  PayloadActionCreator,
  SliceActionType,
  CaseReducer,
  CaseReducerDefinition,
  PayloadAction,
  ReducerCreator,
  ReducerCreatorEntry,
  ReducerCreators,
  ReducerDefinition,
  CreatorCaseReducers,
  Draft,
} from "@reduxjs/toolkit";
import type { HistoryAdapter, HistoryState } from "./redux";
import type { WithRequiredProp } from "./utils";

const historyMethodsCreatorType = Symbol();

interface HistoryReducers<State> {
  undo: CaseReducerDefinition<State, PayloadAction>;
  redo: CaseReducerDefinition<State, PayloadAction>;
  jump: CaseReducerDefinition<State, PayloadAction<number>>;
  clearHistory: CaseReducerDefinition<State, PayloadAction>;
  reset: ReducerDefinition<typeof historyMethodsCreatorType> & {
    type: "reset";
  };
}

interface HistoryMethodsCreatorConfig<State, Data> {
  selectHistoryState?: (state: Draft<State>) => HistoryState<Data>;
}

declare module "@reduxjs/toolkit" {
  export interface SliceReducerCreators<
    State = any,
    CaseReducers extends
      CreatorCaseReducers<State> = CreatorCaseReducers<State>,
    Name extends string = string,
  > {
    [historyMethodsCreatorType]: ReducerCreatorEntry<
      State extends HistoryState<infer Data>
        ? {
            (
              this: ReducerCreators<State>,
              adapter: HistoryAdapter<Data>,
              config?: HistoryMethodsCreatorConfig<State, Data>,
            ): HistoryReducers<State>;
            <Data>(
              this: ReducerCreators<State>,
              adapter: HistoryAdapter<Data>,
              config: WithRequiredProp<
                HistoryMethodsCreatorConfig<State, Data>,
                "selectHistoryState"
              >,
            ): HistoryReducers<State>;
          }
        : <Data>(
            this: ReducerCreators<State>,
            adapter: HistoryAdapter<Data>,
            config: WithRequiredProp<
              HistoryMethodsCreatorConfig<State, Data>,
              "selectHistoryState"
            >,
          ) => HistoryReducers<State>,
      {
        actions: {
          [ReducerName in ReducerNamesOfType<
            CaseReducers,
            typeof historyMethodsCreatorType
          >]: CaseReducers[ReducerName] extends { type: "reset" }
            ? PayloadActionCreator<void, SliceActionType<Name, ReducerName>>
            : never;
        };
        caseReducers: {
          [ReducerName in ReducerNamesOfType<
            CaseReducers,
            typeof historyMethodsCreatorType
          >]: CaseReducers[ReducerName] extends { type: "reset" }
            ? CaseReducer<State, PayloadAction>
            : never;
        };
      }
    >;
  }
}

export const historyMethodsCreator: ReducerCreator<
  typeof historyMethodsCreatorType
> = {
  type: historyMethodsCreatorType,
  create<Data, State = HistoryState<Data>>(
    this: ReducerCreators<State>,
    adapter: HistoryAdapter<Data>,
    {
      selectHistoryState = (state) => state as HistoryState<Data>,
    }: HistoryMethodsCreatorConfig<State, Data> = {},
  ) {
    return {
      undo: this.reducer((state) => {
        adapter.undo(selectHistoryState(state));
      }),
      redo: this.reducer((state) => {
        adapter.redo(selectHistoryState(state));
      }),
      jump: this.reducer<number>((state, action) => {
        adapter.jump(selectHistoryState(state), action);
      }),
      clearHistory: this.reducer((state) => {
        adapter.clearHistory(selectHistoryState(state));
      }),
      reset: {
        _reducerDefinitionType: historyMethodsCreatorType,
        type: "reset",
      },
    };
  },
  handle(details, def, context) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (def.type !== "reset")
      throw new Error(`Unrecognised reducer type ${String(def.type)}`);
    reducerCreator.handle(
      details,
      reducerCreator.create(() => context.getInitialState()),
      context,
    );
  },
};
