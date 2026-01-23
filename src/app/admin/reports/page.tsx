'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const sampleData = [
  { id: 'BK001', date: '2025-11-08', service: 'Standard Cleaning', status: 'completed', amount: 120 },
  { id: 'BK002', date: '2025-11-09', service: 'Office Cleaning', status: 'completed', amount: 200 },
  { id: 'BK003', date: '2025-11-09', service: 'Carpet Cleaning', status: 'completed', amount: 150 },
  { id: 'BK004', date: '2025-11-10', service: 'Move In/Out', status: 'cancelled', amount: 350 },
  { id: 'BK005', date: '2025-11-15', service: 'Deep Cleaning', status: 'confirmed', amount: 250 },
]

const BOOKINGS_STORAGE_KEY = 'adminBookings'

// Simple SVG Line Chart
function LineChartSVG({ points, labels, width = 600, height = 220 }: { points: number[]; labels: string[]; width?: number; height?: number }) {
  const padding = 32;
  const max = Math.max(1, ...points);
  const stepX = (width - padding * 2) / Math.max(1, points.length - 1);
  const scaleY = (val: number) => height - padding - (val / max) * (height - padding * 2);
  const d = points.map((y, i) => `${i === 0 ? 'M' : 'L'} ${padding + i * stepX} ${scaleY(y)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[220px]">
      <rect x="0" y="0" width={width} height={height} fill="transparent" />
      {/* Axes */}
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e5e7eb" />
      <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#e5e7eb" />
      {/* Path */}
      <path d={d} fill="none" stroke="#06b6d4" strokeWidth={2} />
      {/* Points */}
      {points.map((y, i) => (
        <circle key={i} cx={padding + i * stepX} cy={scaleY(y)} r={3} fill="#06b6d4" />
      ))}
      {/* Labels */}
      {labels.map((l, i) => (
        <text key={i} x={padding + i * stepX} y={height - padding + 16} fontSize="10" textAnchor="middle" fill="#6b7280">
          {l.slice(5)}
        </text>
      ))}
    </svg>
  );
}

// Simple SVG Bar Chart
function BarChartSVG({ values, labels, width = 600, height = 220 }: { values: number[]; labels: string[]; width?: number; height?: number }) {
  const padding = 32;
  const max = Math.max(1, ...values);
  const barWidth = (width - padding * 2) / Math.max(1, values.length);
  const scaleY = (val: number) => (val / max) * (height - padding * 2);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[220px]">
      <rect x="0" y="0" width={width} height={height} fill="transparent" />
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e5e7eb" />
      {values.map((v, i) => {
        const x = padding + i * barWidth + 6;
        const h = scaleY(v);
        const y = height - padding - h;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barWidth - 12} height={h} fill="#06b6d4" rx={4} />
            <text x={x + (barWidth - 12) / 2} y={height - padding + 16} fontSize="10" textAnchor="middle" fill="#6b7280">
              {labels[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function ReportsPage() {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [rows, setRows] = useState<{ id: string; date: string; service: string; status: string; amount: number }[]>(sampleData)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const stored = localStorage.getItem(BOOKINGS_STORAGE_KEY)
      if (!stored) return
      const parsed = JSON.parse(stored)
      if (!Array.isArray(parsed)) return
      const normalized = parsed.map((b: any) => {
        const amt = typeof b.amount === 'number' ? b.amount : parseFloat(String(b.amount).replace(/[^0-9.]/g, '')) || 0
        return {
          id: String(b.id || ''),
          date: String(b.date || ''),
          service: String(b.service || ''),
          status: String(b.status || ''),
          amount: amt,
        }
      })
      setRows(normalized)
    } catch (e) {
      // ignore parse errors, fallback to sampleData
    }
  }, [])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const matchesQuery = r.id.toLowerCase().includes(query.toLowerCase()) || r.service.toLowerCase().includes(query.toLowerCase())
      const matchesStatus = status === 'all' ? true : r.status === status
      const inStart = startDate ? r.date >= startDate : true
      const inEnd = endDate ? r.date <= endDate : true
      return matchesQuery && matchesStatus && inStart && inEnd
    })
  }, [rows, query, status, startDate, endDate])

  const totals = useMemo(() => {
    const totalBookings = filtered.length
    const completed = filtered.filter((r) => r.status === 'completed').length
    const cancelled = filtered.filter((r) => r.status === 'cancelled').length
    const revenue = filtered.filter((r) => r.status === 'completed' || r.status === 'confirmed').reduce((sum, r) => sum + r.amount, 0)
    return { totalBookings, completed, cancelled, revenue }
  }, [filtered])

  // Build series for charts from filtered rows
  const revenueByDate = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((r) => {
      if (r.status === 'completed' || r.status === 'confirmed') {
        map.set(r.date, (map.get(r.date) || 0) + r.amount);
      }
    });
    const entries = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    return entries;
  }, [filtered]);

  const statusCounts = useMemo(() => {
    const keys = ['pending', 'confirmed', 'completed', 'cancelled'] as const;
    const counts: Record<string, number> = { pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
    filtered.forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1; });
    return keys.map((k) => ({ label: k, value: counts[k] }));
  }, [filtered])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-end">
        <div className="flex-1 flex gap-3 items-end">
          <div className="flex-1 max-w-sm">
            <Input placeholder="Search reports..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v as any)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Start date</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <span className="pb-2 text-sm text-muted-foreground">to</span>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">End date</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
        </div>
        <Button
          className="text-white"
          style={{ background: 'linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)' }}
          onClick={() => { /* placeholder for export */ }}
        >
          Export CSV
        </Button>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChartSVG
              points={revenueByDate.map(([, v]) => v)}
              labels={revenueByDate.map(([d]) => d)}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChartSVG
              values={statusCounts.map((s) => s.value)}
              labels={statusCounts.map((s) => s.label)}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Total Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totals.totalBookings}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${totals.revenue.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totals.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Cancelled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totals.cancelled}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Details ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Booking ID</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Service</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-border">
                    <td className="py-3 px-4 text-sm font-medium">{r.id}</td>
                    <td className="py-3 px-4 text-sm">{r.date}</td>
                    <td className="py-3 px-4 text-sm">{r.service}</td>
                    <td className="py-3 px-4">{r.status}</td>
                    <td className="py-3 px-4 text-sm font-medium text-right">${r.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
