import { shallowEqual } from "react-redux";
import { useAppSelector } from "../../hooks";

export function Past() {
  const past = useAppSelector(
    (state) => state.counter.past.slice(-4),
    shallowEqual,
  );
  return (
    <div className="past">
      {past.map(({ value }, index) => (
        <p key={`v${value}i${index}`}>count was {value}</p>
      ))}
    </div>
  );
}
