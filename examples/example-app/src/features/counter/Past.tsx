import { useAppSelector } from "../../hooks";

export function Past() {
  const past = useAppSelector((state) => state.counter.past);
  return (
    <div className="past">
      {past.map(({ value }, index) => (
        <p key={`v${value}i${index}`}>count was {value}</p>
      ))}
    </div>
  );
}
