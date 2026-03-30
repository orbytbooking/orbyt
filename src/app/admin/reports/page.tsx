'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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
  charts?: {
    revenueByDate: [string, number][]
    statusCounts: { pending: number; confirmed: number; completed: number; cancelled: number }
  }
}

function LineChartSVG({ points, labels, width = 600, height = 220 }: { points: number[]; labels: string[]; width?: number; height?: number }) {
  const padding = 32
  const max = Math.max(1, ...points)
  const stepX = (width - padding * 2) / Math.max(1, points.length - 1)
  const scaleY = (val: number) => height - padding - (val / max) * (height - padding * 2)
  const d = points.map((y, i) => `${i === 0 ? 'M' : 'L'} ${padding + i * stepX} ${scaleY(y)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[180px] sm:h-[220px]" preserveAspectRatio="xMidYMid meet">
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e5e7eb" />
      <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#e5e7eb" />
      <path d={d} fill="none" stroke="#06b6d4" strokeWidth={2} />
      {points.map((y, i) => <circle key={i} cx={padding + i * stepX} cy={scaleY(y)} r={3} fill="#06b6d4" />)}
      {labels.map((l, i) => (
        <text key={i} x={padding + i * stepX} y={height - padding + 16} fontSize="10" textAnchor="middle" fill="#6b7280">
          {l.slice(5)}
        </text>
      ))}
    </svg>
  )
}

function BarChartSVG({ values, labels, width = 600, height = 220 }: { values: number[]; labels: string[]; width?: number; height?: number }) {
  const padding = 32
  const max = Math.max(1, ...values)
  const barWidth = (width - padding * 2) / Math.max(1, values.length)
  const scaleY = (val: number) => (val / max) * (height - padding * 2)

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[180px] sm:h-[220px]" preserveAspectRatio="xMidYMid meet">
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e5e7eb" />
      {values.map((v, i) => {
        const x = padding + i * barWidth + 6
        const h = scaleY(v)
        const y = height - padding - h
        return (
          <g key={i}>
            <rect x={x} y={y} width={barWidth - 12} height={h} fill="#06b6d4" rx={4} />
            <text x={x + (barWidth - 12) / 2} y={height - padding + 16} fontSize="10" textAnchor="middle" fill="#6b7280">
              {labels[i]}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function MetricListCard({
  title,
  rows,
  actionHref,
}: {
  title: string
  rows: Array<{ label: string; value: string | number; highlight?: boolean }>
  actionHref?: string
}) {
  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{title}</CardTitle>
        {actionHref ? (
          <Button asChild variant="outline" size="sm" className="h-7 px-2 text-xs">
            <Link href={actionHref}>Go To Reports</Link>
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map((r) => (
          <div key={r.label} className={`flex items-center justify-between text-sm ${r.highlight ? 'bg-muted px-2 py-1 rounded' : ''}`}>
            <span className="text-muted-foreground">{r.label}</span>
            <span className="font-medium">{r.value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export default function ReportsPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [industry, setIndustry] = useState<string>('all')
  const [location, setLocation] = useState<string>('all')
  const [data, setData] = useState<ReportsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (query) params.append('query', query)
      if (status !== 'all') params.append('status', status)
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      const response = await fetch(`/api/admin/reports?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch reports')
      const result = await response.json()
      if (!result.success) throw new Error(result.error || 'Unknown error')
      setData(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [query, status, startDate, endDate])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  const bookings = data?.bookings ?? []
  const totals = data?.summary ?? { totalBookings: 0, revenue: 0, completed: 0, cancelled: 0 }

  const paymentStats = useMemo(() => {
    const paid = bookings.filter((b) => b.payment_status === 'paid').reduce((s, b) => s + (b.amount || 0), 0)
    const pending = bookings.filter((b) => b.payment_status !== 'paid').reduce((s, b) => s + (b.amount || 0), 0)
    return { paid, pending }
  }, [bookings])

  const recurringCount = useMemo(
    () => bookings.filter((b) => String(b.service || '').toLowerCase().includes('recurr')).length,
    [bookings]
  )
  const oneTimeCount = Math.max(0, totals.totalBookings - recurringCount)
  const revenueByDate = data?.charts?.revenueByDate ?? []
  const recurringRevenue = useMemo(
    () =>
      bookings
        .filter((b) => String(b.service || '').toLowerCase().includes('recurr'))
        .reduce((sum, b) => sum + (b.amount || 0), 0),
    [bookings]
  )
  const oneTimeRevenue = useMemo(
    () =>
      bookings
        .filter((b) => !String(b.service || '').toLowerCase().includes('recurr'))
        .reduce((sum, b) => sum + (b.amount || 0), 0),
    [bookings]
  )
  const moneyBreakdown = useMemo(
    () => [
      { label: 'Paid', value: paymentStats.paid },
      { label: 'Pending', value: paymentStats.pending },
      { label: 'Recurring', value: recurringRevenue },
      { label: 'One time', value: oneTimeRevenue },
    ],
    [paymentStats.paid, paymentStats.pending, recurringRevenue, oneTimeRevenue]
  )

  if (error) {
    return (
      <div className="space-y-4">
        <div className="text-red-600 text-sm">{error}</div>
        <Button onClick={fetchReports}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" className="h-8 px-2.5" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Reports dashboard</h1>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger><SelectValue placeholder="Industry" /></SelectTrigger>
              <SelectContent><SelectItem value="all">Industry: All</SelectItem></SelectContent>
            </Select>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger><SelectValue placeholder="Locations" /></SelectTrigger>
              <SelectContent><SelectItem value="all">Locations: All</SelectItem></SelectContent>
            </Select>
            <Input placeholder="Search reports" value={query} onChange={(e) => setQuery(e.target.value)} />
            <Button onClick={fetchReports}>Apply</Button>
          </div>
          <div className="text-sm">
            Report for date: <span className="font-medium">{startDate || '—'} to {endDate || '—'}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Popular reports</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <MetricListCard
            title="Revenue"
            actionHref="/admin/reports/revenue"
            rows={[
              { label: 'Total', value: `$${totals.revenue.toFixed(2)}` },
              { label: 'Billed total revenue', value: `$${totals.revenue.toFixed(2)}` },
              { label: 'Pending payments', value: `$${paymentStats.pending.toFixed(2)}` },
              { label: 'Recurring', value: recurringCount, highlight: true },
              { label: 'One time', value: oneTimeCount },
            ]}
          />
          <MetricListCard
            title="Bookings"
            actionHref="/admin/reports/revenue"
            rows={[
              { label: 'Total', value: totals.totalBookings },
              { label: 'Recurring', value: recurringCount, highlight: true },
              { label: 'Weekly', value: bookings.filter((b) => String(b.service).toLowerCase().includes('week')).length },
              { label: 'One time', value: oneTimeCount },
            ]}
          />
          <MetricListCard
            title="Payments"
            actionHref="/admin/reports/revenue"
            rows={[
              { label: 'Total', value: `$${totals.revenue.toFixed(2)}` },
              { label: 'Total paid amount', value: `$${paymentStats.paid.toFixed(2)}` },
              { label: 'Pending payments', value: `$${paymentStats.pending.toFixed(2)}` },
              { label: 'Bookings', value: `$${totals.revenue.toFixed(2)}`, highlight: true },
              { label: 'Custom invoices', value: '$0.00' },
            ]}
          />
          <MetricListCard
            title="Referrals"
            rows={[
              { label: 'Completed referrals', value: 0 },
              { label: 'Booked', value: 0 },
              { label: 'Invited', value: 0 },
              { label: 'Registered', value: 0 },
            ]}
          />
          <MetricListCard
            title="Trends"
            rows={[
              {
                label: 'Revenue per booking',
                value: totals.totalBookings > 0 ? `$${(totals.revenue / totals.totalBookings).toFixed(2)}` : '$0.00',
              },
              { label: 'Recurring', value: `$${bookings.filter((b) => String(b.service).toLowerCase().includes('recurr')).reduce((s, b) => s + b.amount, 0).toFixed(2)}`, highlight: true },
              { label: 'One time', value: `$${bookings.filter((b) => !String(b.service).toLowerCase().includes('recurr')).reduce((s, b) => s + b.amount, 0).toFixed(2)}` },
            ]}
          />
          <MetricListCard
            title="Ratings"
            rows={[
              { label: '0/5 out of 0', value: '' },
              { label: '5 star', value: '0%' },
              { label: '4 star', value: '0%' },
              { label: '3 star', value: '0%' },
              { label: '2 star', value: '0%' },
              { label: '1 star', value: '0%' },
            ]}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2 sm:pb-6">
            <CardTitle className="text-base sm:text-lg font-semibold">Revenue Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChartSVG points={revenueByDate.map(([, v]) => v)} labels={revenueByDate.map(([d]) => d)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 sm:pb-6">
            <CardTitle className="text-base sm:text-lg font-semibold">Revenue Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChartSVG values={moneyBreakdown.map((s) => s.value)} labels={moneyBreakdown.map((s) => s.label)} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>More reports</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Button variant="outline">Cancellation reports</Button>
          <Button variant="outline">Services</Button>
          <Button variant="outline">Busiest slowest time</Button>
          <Button variant="outline">Customer details</Button>
        </CardContent>
      </Card>

      {loading ? <div className="text-sm text-muted-foreground">Loading…</div> : null}
    </div>
  )
}
