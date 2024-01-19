import { Buffer } from "buffer";
import { DateTime } from "luxon";

// @ts-expect-error - polyfill
window.Buffer = Buffer;

import { AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";

import { useEffect, useState } from "react";

import "./App.css";

function App() {
  const [data, setData] = useState([]);

  useEffect(() => {
    async function main() {
      const res = await fetch("/metrics.json");
      if (res.ok) {
        const json = await res.json();

        setData(json);
      }
    }
    main();
  }, []);

  return (
    <>
      <h1>Evolution of the number of controllers</h1>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {data.length === 0 && <p>Loading...</p>}
        {data.length > 0 && (
          <AreaChart
            width={900}
            height={400}
            data={data}
            margin={{
              top: 10,
              right: 30,
              left: 0,
              bottom: 0,
            }}
          >
            <XAxis
              dataKey="day"
              tickFormatter={(tickItem) =>
                DateTime.fromFormat(tickItem, "yyyy/mm/dd").toFormat("mm/yy")
              }
            />
            <YAxis />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="v2"
              stackId="1"
              stroke="#8884d8"
              fill="#8884d8"
            />
            <Area
              type="monotone"
              dataKey="v1"
              stackId="1"
              stroke="#82ca9d"
              fill="#82ca9d"
            />
          </AreaChart>
        )}
      </div>
    </>
  );
}

export default App;
