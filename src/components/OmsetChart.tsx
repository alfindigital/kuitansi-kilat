import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip } from "recharts";
import { formatIDR, formatDateID } from "@/lib/format";

export default function OmsetChart({ buckets }: { buckets: { date: string; omset: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={buckets}>
        <XAxis dataKey="date" hide />
        <Tooltip
          cursor={{ fill: "rgba(0,0,0,0.04)" }}
          contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--popover)", fontSize: 12 }}
          formatter={(v: number) => [formatIDR(v), "Omset"]}
          labelFormatter={(l: string) => formatDateID(l + "T00:00:00")}
        />
        <Bar dataKey="omset" radius={[6, 6, 0, 0]} fill="var(--primary)" />
      </BarChart>
    </ResponsiveContainer>
  );
}
