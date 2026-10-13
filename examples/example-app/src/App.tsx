import { Count } from "./features/counter/Count";
import { Future } from "./features/counter/Future";
import { HistoryButtons } from "./features/counter/HistoryButtons";
import { Past } from "./features/counter/Past";

import "./App.css";

function App() {
  return (
    <>
      <div className="values">
        <Past />
        <Count />
        <Future />
      </div>
      <HistoryButtons />
    </>
  );
}

export default App;
