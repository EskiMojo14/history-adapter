import { shallowEqual } from "react-redux";
import { useAppSelector } from "../../hooks";

export function Future() {
  const future = useAppSelector(
    (state) => state.counter.future.slice(0, 4),
    shallowEqual,
  );
  return (
    <div className="future">
      {future.map(({ value }, index) => (
        <p key={`v${value}i${index}`}>
          count will be <span className="count">{value}</span>
        </p>
      ))}
    </div>
  );
}
