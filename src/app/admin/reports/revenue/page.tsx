'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Brush,
} from 'recharts'

interface ReportData {
  id: string
  date: string
  scheduled_date: string
  service: string
  status: string
  amount: number
  payment_status?: string
}

interface ReportsResponse {
  bookings: ReportData[]
  summary: { totalBookings: number; revenue: number; completed: number; cancelled: number }
  charts?: { revenueByDate: [string, number][] }
}

function RevenueAreaChart({
  pointsPrimary,
  pointsSecondary,
  labels,
}: {
  pointsPrimary: number[]
  pointsSecondary: number[]
  labels: string[]
}) {
  if (pointsPrimary.length === 0) {
    return <div className="h-[320px] flex items-center justify-center text-sm text-muted-foreground">No revenue data for this range.</div>
  }

  const data = labels.map((label, i) => ({
    date: label,
    revenue: pointsPrimary[i] ?? 0,
    revenueExcludingVariables: pointsSecondary[i] ?? 0,
  }))
  const [zoomStart, setZoomStart] = useState(0)
  const [zoomEnd, setZoomEnd] = useState(Math.max(0, data.length - 1))
  const isZoomed = zoomStart !== 0 || zoomEnd !== Math.max(0, data.length - 1)

  const displayed = data.slice(zoomStart, zoomEnd + 1)
  const [minY, maxY] = useMemo(() => {
    const vals = displayed.flatMap((d) => [d.revenue, d.revenueExcludingVariables])
    const min = Math.min(...vals)
    const max = Math.max(...vals)
    const pad = Math.max(10, (max - min) * 0.15)
    return [Math.max(0, Math.floor(min - pad)), Math.ceil(max + pad)]
  }, [displayed])

  return (
    <div className="h-[340px] w-full">
      <div className="flex justify-end mb-2">
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-[11px] font-semibold"
          disabled={!isZoomed}
          onClick={() => {
            setZoomStart(0)
            setZoomEnd(Math.max(0, data.length - 1))
          }}
        >
          Reset zoom
        </Button>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 10, left: 0, bottom: 30 }}>
          <defs>
            <linearGradient id="revPrimary" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.55} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.08} />
            </linearGradient>
            <linearGradient id="revSecondary" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="0" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#4b5563', fontSize: 11, fontWeight: 700 }}
            tickFormatter={(v) => String(v).slice(5)}
          />
          <YAxis tick={{ fill: '#4b5563', fontSize: 11, fontWeight: 700 }} label={{ value: 'Revenue ($)', angle: -90, position: 'insideLeft', style: { fill: '#4b5563', fontWeight: 700, fontSize: 11 } }} domain={[minY, maxY]} />
          <Tooltip
            contentStyle={{ borderRadius: 8, borderColor: '#d1d5db', fontWeight: 700, fontSize: 11 }}
            formatter={(value: number, name: string) => [`$${Number(value).toFixed(0)}`, name === 'revenue' ? 'Revenue' : 'Revenue Excluding Variables']}
            labelFormatter={(label) => String(label)}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, fontWeight: 700 }}
            formatter={(value) => (value === 'revenue' ? 'Revenue' : 'Revenue Excluding Variables')}
          />
          <Area type="monotone" dataKey="revenueExcludingVariables" stroke="#1d4ed8" strokeWidth={2} fill="url(#revSecondary)" dot={{ r: 2 }} />
          <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2.5} fill="url(#revPrimary)" dot={{ r: 2.5 }} />
          <Brush
            dataKey="date"
            height={20}
            stroke="#9ca3af"
            travellerWidth={8}
            startIndex={zoomStart}
            endIndex={zoomEnd}
            onChange={(e) => {
              if (typeof e?.startIndex === 'number') setZoomStart(e.startIndex)
              if (typeof e?.endIndex === 'number') setZoomEnd(e.endIndex)
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function RevenueReportsPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [industry, setIndustry] = useState('all')
  const [location, setLocation] = useState('all')
  const [data, setData] = useState<ReportsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchReports = useCallback(async () => {
    try {
      setError(null)
      const params = new URLSearchParams()
      if (query) params.append('query', query)
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      const response = await fetch(`/api/admin/reports?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch reports')
      const result = await response.json()
      if (!result.success) throw new Error(result.error || 'Unknown error')
      setData(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }, [query, startDate, endDate])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  const bookings = data?.bookings ?? []
  const totalRevenue = data?.summary.revenue ?? 0
  const billedRevenue = totalRevenue
  const pendingPayments = bookings.filter((b) => b.payment_status !== 'paid').reduce((sum, b) => sum + (b.amount || 0), 0)
  const tips = 0
  const parking = 0
  const serviceFee = 0
  const salesTax = 0
  const cancellationCharges = 0
  const rescheduleFee = 0
  const refundsGiven = 0
  const declinedPayments = 0
  const revenueExcludingVariables = Math.max(
    0,
    totalRevenue - (serviceFee + salesTax + cancellationCharges + rescheduleFee + refundsGiven + tips + parking)
  )

  const revenueSeries = useMemo(() => {
    // Build a money-by-day series from bookings so the chart always represents actual dollars.
    const byDate = new Map<string, number>()
    for (const booking of bookings) {
      const dateKeyRaw = booking.scheduled_date || booking.date
      if (!dateKeyRaw) continue
      const dateKey = String(dateKeyRaw).slice(0, 10)
      byDate.set(dateKey, (byDate.get(dateKey) || 0) + (booking.amount || 0))
    }

    let series = Array.from(byDate.entries()).sort((a, b) => a[0].localeCompare(b[0])) as [string, number][]

    if (series.length === 0 && totalRevenue > 0) {
      series = [[new Date().toISOString().slice(0, 10), totalRevenue]]
    }

    // A single point often looks like "no chart"; duplicate it to make the trend visible.
    if (series.length === 1) {
      const [date, value] = series[0]
      series = [
        [date, value],
        [`${date} (end)`, value],
      ]
    }

    return series
  }, [bookings, totalRevenue])

  if (error) {
    return (
      <div className="space-y-4">
        <div className="text-sm text-red-600">{error}</div>
        <Button onClick={fetchReports}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Button variant="outline" size="sm" className="h-8 px-2.5" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back
        </Button>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Revenue reports</h1>
          <p className="text-sm text-muted-foreground">Track revenue trends and key billing totals.</p>
        </div>
      </div>

      <Card className="border-muted/70 shadow-sm">
        <CardContent className="pt-5 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2.5">
            <Input className="h-9" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <Input className="h-9" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Industry" /></SelectTrigger>
              <SelectContent><SelectItem value="all">Industry: All</SelectItem></SelectContent>
            </Select>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Locations" /></SelectTrigger>
              <SelectContent><SelectItem value="all">Locations: All</SelectItem></SelectContent>
            </Select>
            <Input className="h-9" placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
            <Button className="h-9" onClick={fetchReports}>Apply</Button>
          </div>
          <div className="text-sm text-muted-foreground">
            Report for date: <span className="font-medium">{startDate || '—'} to {endDate || '—'}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-muted/70 shadow-sm">
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-2 text-sm">
            <div className="flex items-center justify-between border-b py-1.5"><span className="text-muted-foreground font-semibold">Total revenue</span><span className="font-bold">${totalRevenue.toFixed(2)}</span></div>
            <div className="flex items-center justify-between border-b py-1.5"><span className="text-muted-foreground">Service fee</span><span>${serviceFee.toFixed(2)}</span></div>
            <div className="flex items-center justify-between border-b py-1.5"><span className="text-muted-foreground font-semibold">Billed total revenue</span><span className="font-bold">${billedRevenue.toFixed(2)}</span></div>
            <div className="flex items-center justify-between border-b py-1.5"><span className="text-muted-foreground">Sales tax</span><span>${salesTax.toFixed(2)}</span></div>
            <div className="flex items-center justify-between border-b py-1.5"><span className="text-muted-foreground">Pending payments</span><span>${pendingPayments.toFixed(2)}</span></div>
            <div className="flex items-center justify-between border-b py-1.5"><span className="text-muted-foreground">Cancellation charges</span><span>${cancellationCharges.toFixed(2)}</span></div>
            <div className="flex items-center justify-between border-b py-1.5"><span className="text-muted-foreground font-semibold">Revenue excluding variables</span><span className="font-bold">${revenueExcludingVariables.toFixed(2)}</span></div>
            <div className="flex items-center justify-between border-b py-1.5"><span className="text-muted-foreground">Reschedule fee</span><span>${rescheduleFee.toFixed(2)}</span></div>
            <div className="flex items-center justify-between border-b py-1.5"><span className="text-muted-foreground">Tips</span><span>${tips.toFixed(2)}</span></div>
            <div className="flex items-center justify-between border-b py-1.5"><span className="text-muted-foreground">Refunds given</span><span>${refundsGiven.toFixed(2)}</span></div>
            <div className="flex items-center justify-between border-b py-1.5"><span className="text-muted-foreground">Parking</span><span>${parking.toFixed(2)}</span></div>
            <div className="flex items-center justify-between border-b py-1.5"><span className="text-muted-foreground">Declined payments</span><span>${declinedPayments.toFixed(2)}</span></div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-muted/70 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle>Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueAreaChart
            pointsPrimary={revenueSeries.map(([, v]) => v)}
            pointsSecondary={revenueSeries.map(([, v]) => Math.max(0, v - (serviceFee + salesTax + cancellationCharges + rescheduleFee + refundsGiven + tips + parking)))}
            labels={revenueSeries.map(([d]) => d)}
          />
        </CardContent>
      </Card>
    </div>
  )
}
