// react-doctor-disable-next-line react-doctor/prefer-dynamic-import -- KPI sparklines are first-paint dashboard content.
import { Line, LineChart, ResponsiveContainer } from "recharts";

export function Sparkline({ data, color }: { data: Array<{ v: number }>; color: string }) {
  return (
    <div className="absolute bottom-3 right-3 h-7 w-20 opacity-90">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line dataKey="v" type="monotone" dot={false} stroke={color} strokeWidth={1.5} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
