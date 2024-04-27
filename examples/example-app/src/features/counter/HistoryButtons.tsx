import { ReactNode } from "react";
import { useAppDispatch, useAppSelector } from "../../hooks";
import {
  historyCleared,
  decremented,
  incremented,
  jumped,
  pauseToggled,
  redone,
  reset,
  selectCanRedo,
  selectCanUndo,
  selectPaused,
  undone,
} from "./counterSlice";

function ButtonGroup({ children }: { children: ReactNode }) {
  return <div className="button-group">{children}</div>;
}

export function HistoryButtons() {
  const dispatch = useAppDispatch();
  const paused = useAppSelector(selectPaused);
  const canUndo = useAppSelector(selectCanUndo);
  const canRedo = useAppSelector(selectCanRedo);
  return (
    <div className="card">
      <ButtonGroup>
        <button onClick={() => dispatch(incremented(1))}>increment</button>
        <button onClick={() => dispatch(decremented(1))}>decrement</button>
      </ButtonGroup>
      <ButtonGroup>
        <button disabled={!canUndo} onClick={() => dispatch(undone())}>
          undo
        </button>
        <button disabled={!canRedo} onClick={() => dispatch(redone())}>
          redo
        </button>
      </ButtonGroup>
      <ButtonGroup>
        <button disabled={!canUndo} onClick={() => dispatch(jumped(-2))}>
          jump back 2
        </button>
        <button disabled={!canRedo} onClick={() => dispatch(jumped(2))}>
          jump forward 2
        </button>
      </ButtonGroup>
      <ButtonGroup>
        <button onClick={() => dispatch(pauseToggled())}>
          {paused ? "resume" : "pause"} history
        </button>
        <button onClick={() => dispatch(historyCleared())}>
          clear history
        </button>
      </ButtonGroup>
      <button onClick={() => dispatch(reset())}>reset</button>
    </div>
  );
}
