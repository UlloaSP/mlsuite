import { defineChart, lineY } from "@tanstack/charts";
import { Chart } from "@tanstack/charts/react";
import { scaleLinear } from "@tanstack/charts/scales/linear";

export function Sparkline({ data, color }: { data: Array<{ v: number }>; color: string }) {
  const peak = data.reduce((max, point) => Math.max(max, point.v), 0);
  const definition = defineChart({
    marks: [lineY(data, { y: "v", stroke: color, strokeWidth: 1.5 })],
    scales: {
      x: { scale: scaleLinear },
      y: { scale: scaleLinear().domain([0, peak || 1]), nice: 5 },
    },
    guides: false,
    margin: 5,
    pointer: false,
    keyboard: false,
  });
  return (
    <div aria-hidden="true" className="absolute bottom-3 right-3 h-7 w-20 opacity-90">
      <Chart
        definition={definition}
        ariaLabel="Recent trend"
        initialWidth={80}
        style={{ height: "100%" }}
      />
    </div>
  );
}
