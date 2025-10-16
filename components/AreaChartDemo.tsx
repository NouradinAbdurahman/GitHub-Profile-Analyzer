"use client";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const sampleData = [
  { name: 'Jan', uv: 400 },
  { name: 'Feb', uv: 700 },
  { name: 'Mar', uv: 200 },
  { name: 'Apr', uv: 900 },
  { name: 'May', uv: 600 },
  { name: 'Jun', uv: 800 },
];

export default function AreaChartDemo() {
  return (
    <div className="w-full max-w-2xl rounded-lg border bg-card p-6 shadow-sm">
      <h2 className="mb-2 text-lg font-bold text-center">Sample Area Chart</h2>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={sampleData} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#23272f" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#23272f" />
          <XAxis dataKey="name" stroke="#a3e635" />
          <YAxis stroke="#a3e635" />
          <Tooltip />
          <Area type="monotone" dataKey="uv" stroke="#38bdf8" fillOpacity={1} fill="url(#colorUv)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
} 