import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  RadialBarChart, RadialBar
} from 'recharts'

const ChartTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white shadow-card rounded-lg border border-slate-100 px-3 py-2">
      <p className="text-xs font-semibold text-slate-700">{payload[0].payload.name}</p>
      <p className="text-xs text-brand-600">{payload[0].value}% complete</p>
    </div>
  )
}

export function PerSubjectChart({ data }) {
  const chartData = data.map(s => ({
    name: s.subject.name,
    rate: s.completionRate,
    color: s.subject.color || '#6366F1',
  }))

  if (chartData.length === 0) {
    return (
      <div className="h-[250px] flex items-center justify-center text-sm text-slate-400">
        No subjects yet — add your first subject to see progress.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(99,102,241,0.05)' }} />
        <Bar dataKey="rate" radius={[8, 8, 0, 0]} maxBarSize={48}>
          {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function OverallRing({ value = 0, size = 180, label = 'Overall' }) {
  const data = [{ name: 'Progress', value, fill: 'url(#ringGradient)' }]

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart innerRadius="75%" outerRadius="100%" data={data} startAngle={90} endAngle={-270}>
          <defs>
            <linearGradient id="ringGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#EC4899" />
            </linearGradient>
          </defs>
          <RadialBar dataKey="value" cornerRadius={20} background={{ fill: '#F1F5F9' }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold bg-brand-gradient bg-clip-text text-transparent">{value}%</span>
        <span className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">{label}</span>
      </div>
    </div>
  )
}

export default PerSubjectChart
