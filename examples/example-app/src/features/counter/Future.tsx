import { useAppSelector } from "../../hooks";

export function Future() {
  const future = useAppSelector((state) => state.counter.future);
  return (
    <div className="future">
      {future.map(({ value }, index) => (
        <p key={`v${value}i${index}`}>count will be {value}</p>
      ))}
    </div>
  );
}
