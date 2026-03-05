'use client'

import { useEffect, useMemo, useState } from 'react'
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
  customer_name: string
  customer_email: string
  customer_phone: string
  payment_method?: string
  payment_status?: string
  notes?: string
  created_at: string
}

interface ReportsResponse {
  bookings: ReportData[]
  summary: {
    totalBookings: number
    revenue: number
    completed: number
    cancelled: number
  }
  charts: {
    revenueByDate: [string, number][]
    statusCounts: {
      pending: number
      confirmed: number
      completed: number
      cancelled: number
    }
  }
}

// Simple SVG Line Chart
function LineChartSVG({ points, labels, width = 600, height = 220 }: { points: number[]; labels: string[]; width?: number; height?: number }) {
  const padding = 32;
  const max = Math.max(1, ...points);
  const stepX = (width - padding * 2) / Math.max(1, points.length - 1);
  const scaleY = (val: number) => height - padding - (val / max) * (height - padding * 2);
  const d = points.map((y, i) => `${i === 0 ? 'M' : 'L'} ${padding + i * stepX} ${scaleY(y)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[180px] sm:h-[220px]" preserveAspectRatio="xMidYMid meet">
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
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[180px] sm:h-[220px]" preserveAspectRatio="xMidYMid meet">
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
  const [data, setData] = useState<ReportsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [initialLoad, setInitialLoad] = useState(true)

  const fetchReports = async () => {
    try {
      if (!initialLoad) setLoading(true)
      setError(null)
      
      const params = new URLSearchParams()
      if (query) params.append('query', query)
      if (status !== 'all') params.append('status', status)
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      
      // Debug logging
      console.log('Fetching reports with params:', {
        query,
        status,
        startDate,
        endDate,
        paramString: params.toString()
      })
      
      const response = await fetch(`/api/admin/reports?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch reports')
      }
      
      const result = await response.json()
      if (result.success) {
        console.log('Reports data received:', result.data)
        setData(result.data)
      } else {
        throw new Error(result.error || 'Unknown error')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Reports fetch error:', err)
    } finally {
      setLoading(false)
      if (initialLoad) setInitialLoad(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [])

  useEffect(() => {
    // Debounced search
    const timer = setTimeout(() => {
      fetchReports()
    }, 300)
    
    return () => clearTimeout(timer)
  }, [query, status, startDate, endDate])

  const filtered = useMemo(() => {
    if (!data) return []
    return data.bookings
  }, [data])

  const totals = useMemo(() => {
    if (!data) return { totalBookings: 0, completed: 0, cancelled: 0, revenue: 0 }
    return data.summary
  }, [data])

  // Build series for charts from API data
  const revenueByDate = useMemo(() => {
    if (!data) return []
    return data.charts.revenueByDate
  }, [data])

  const statusCounts = useMemo(() => {
    if (!data) return []
    const keys = ['pending', 'confirmed', 'completed', 'cancelled'] as const;
    return keys.map((k) => ({ label: k, value: data.charts.statusCounts[k] }));
  }, [data])

  const exportCSV = () => {
    if (!data) return
    
    // Create proper CSV format that Excel opens without warnings
    const headers = ['Booking ID', 'Customer Name', 'Customer Email', 'Customer Phone', 'Scheduled Date', 'Created Date', 'Service', 'Status', 'Amount']
    
    let csvContent = headers.join(',') + '\n'
    
    data.bookings.forEach(booking => {
      csvContent += [
        `"${booking.id}"`,
        `"${booking.customer_name || 'N/A'}"`,
        `"${booking.customer_email || 'N/A'}"`,
        `"${booking.customer_phone || 'N/A'}"`,
        `"${booking.scheduled_date || 'N/A'}"`,
        `"${booking.created_at?.split('T')[0] || 'N/A'}"`,
        `"${booking.service}"`,
        `"${booking.status}"`,
        `"${booking.amount.toFixed(2)}"`
      ].join(',') + '\n'
    })
    
    // Add UTF-8 BOM for Excel compatibility
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reports-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  if (loading && initialLoad) {
    return (
      <div className="space-y-6 px-3 sm:px-0 min-w-0">
        <div className="text-center py-8">
          <div className="text-sm sm:text-base text-muted-foreground">Loading reports...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6 px-3 sm:px-0 min-w-0">
        <div className="text-center py-8 px-2">
          <div className="text-sm sm:text-base text-red-600 break-words">Error: {error}</div>
          <Button onClick={fetchReports} className="mt-4 text-sm">Retry</Button>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-6 px-3 sm:px-0 min-w-0">
        <div className="text-center py-8">
          <div className="text-sm sm:text-base text-muted-foreground">No data available</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-3 sm:px-0 min-w-0 max-w-full">
      {/* Filters: stack on mobile, row on larger screens */}
      <div className="flex flex-col gap-4 min-w-0">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:justify-between sm:items-end">
          <div className="flex flex-col sm:flex-row flex-1 gap-3 sm:items-end w-full sm:max-w-none min-w-0">
            <div className="w-full min-w-0 sm:flex-1 sm:max-w-sm">
              <Input placeholder="Search reports..." value={query} onChange={(e) => setQuery(e.target.value)} className="w-full min-w-0 text-sm sm:text-base" />
            </div>
            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
              <SelectTrigger className="w-full sm:w-40 text-sm sm:text-base min-w-0">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-sm sm:text-base">All Status</SelectItem>
                <SelectItem value="pending" className="text-sm sm:text-base">Pending</SelectItem>
                <SelectItem value="confirmed" className="text-sm sm:text-base">Confirmed</SelectItem>
                <SelectItem value="completed" className="text-sm sm:text-base">Completed</SelectItem>
                <SelectItem value="cancelled" className="text-sm sm:text-base">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <div className="grid grid-cols-[1fr_auto_1fr] gap-2 sm:flex sm:items-end sm:gap-3 min-w-0">
              <div className="space-y-1 col-span-1 min-w-0">
                <label className="text-xs sm:text-sm text-muted-foreground block">Start date</label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full min-w-0 text-sm sm:text-base" />
              </div>
              <span className="pb-2 text-xs sm:text-sm text-muted-foreground self-end sm:flex-shrink-0">to</span>
              <div className="space-y-1 col-span-1 min-w-0">
                <label className="text-xs sm:text-sm text-muted-foreground block">End date</label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full min-w-0 text-sm sm:text-base" />
              </div>
            </div>
          </div>
          <Button
            className="w-full sm:w-auto text-white shrink-0 text-sm sm:text-base"
            style={{ background: 'linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)' }}
            onClick={exportCSV}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-w-0">
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="pb-2 sm:pb-6">
            <CardTitle className="text-base sm:text-lg font-semibold">Revenue Over Time</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0">
            <LineChartSVG
              points={revenueByDate.map(([, v]) => v)}
              labels={revenueByDate.map(([d]) => d)}
            />
          </CardContent>
        </Card>
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="pb-2 sm:pb-6">
            <CardTitle className="text-base sm:text-lg font-semibold">Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0">
            <BarChartSVG
              values={statusCounts.map((s) => s.value)}
              labels={statusCounts.map((s) => s.label)}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="py-3 sm:py-6 px-3 sm:px-6">
            <CardTitle className="text-xs sm:text-sm text-muted-foreground truncate">Total Bookings</CardTitle>
          </CardHeader>
          <CardContent className="pb-3 sm:pb-6 px-3 sm:px-6">
            <div className="text-lg sm:text-2xl lg:text-3xl font-bold truncate" title={String(totals.totalBookings)}>{totals.totalBookings}</div>
          </CardContent>
        </Card>
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="py-3 sm:py-6 px-3 sm:px-6">
            <CardTitle className="text-xs sm:text-sm text-muted-foreground truncate">Revenue</CardTitle>
          </CardHeader>
          <CardContent className="pb-3 sm:pb-6 px-3 sm:px-6">
            <div className="text-lg sm:text-2xl lg:text-3xl font-bold truncate" title={`$${totals.revenue.toLocaleString()}`}>${totals.revenue.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="py-3 sm:py-6 px-3 sm:px-6">
            <CardTitle className="text-xs sm:text-sm text-muted-foreground truncate">Completed</CardTitle>
          </CardHeader>
          <CardContent className="pb-3 sm:pb-6 px-3 sm:px-6">
            <div className="text-lg sm:text-2xl lg:text-3xl font-bold truncate" title={String(totals.completed)}>{totals.completed}</div>
          </CardContent>
        </Card>
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="py-3 sm:py-6 px-3 sm:px-6">
            <CardTitle className="text-xs sm:text-sm text-muted-foreground truncate">Cancelled</CardTitle>
          </CardHeader>
          <CardContent className="pb-3 sm:pb-6 px-3 sm:px-6">
            <div className="text-lg sm:text-2xl lg:text-3xl font-bold truncate" title={String(totals.cancelled)}>{totals.cancelled}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="px-3 py-3 sm:px-6 sm:py-6">
          <CardTitle className="text-base sm:text-lg font-semibold truncate">Report Details ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0 md:p-6 min-w-0">
          {/* Mobile: card list */}
          <div className="md:hidden divide-y divide-border">
            {filtered.map((r) => (
              <div key={r.id} className="p-3 sm:p-4 space-y-2 min-w-0">
                <div className="flex justify-between items-start gap-2 min-w-0">
                  <span className="text-sm sm:text-base font-medium truncate min-w-0" title={r.customer_name || 'N/A'}>{r.customer_name || 'N/A'}</span>
                  <span className="text-sm sm:text-base font-medium shrink-0">${r.amount.toFixed(2)}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs sm:text-sm text-muted-foreground min-w-0">
                  <span className="shrink-0">Scheduled</span>
                  <span className="truncate min-w-0" title={r.scheduled_date || 'N/A'}>{r.scheduled_date || 'N/A'}</span>
                  <span className="shrink-0">Created</span>
                  <span className="truncate min-w-0" title={r.created_at?.split('T')[0] || 'N/A'}>{r.created_at?.split('T')[0] || 'N/A'}</span>
                  <span className="shrink-0">Service</span>
                  <span className="truncate min-w-0" title={r.service}>{r.service}</span>
                  <span className="shrink-0">Status</span>
                  <span className="capitalize truncate min-w-0">{r.status}</span>
                </div>
              </div>
            ))}
          </div>
          {/* Desktop: table */}
          <div className="hidden md:block overflow-x-auto min-w-0">
            <table className="w-full min-w-0">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-3 lg:px-4 text-xs sm:text-sm font-medium text-muted-foreground">Customer Name</th>
                  <th className="text-left py-3 px-3 lg:px-4 text-xs sm:text-sm font-medium text-muted-foreground">Scheduled Date</th>
                  <th className="text-left py-3 px-3 lg:px-4 text-xs sm:text-sm font-medium text-muted-foreground">Created Date</th>
                  <th className="text-left py-3 px-3 lg:px-4 text-xs sm:text-sm font-medium text-muted-foreground">Service</th>
                  <th className="text-left py-3 px-3 lg:px-4 text-xs sm:text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-right py-3 px-3 lg:px-4 text-xs sm:text-sm font-medium text-muted-foreground">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-border">
                    <td className="py-3 px-3 lg:px-4 text-xs sm:text-sm font-medium max-w-[120px] lg:max-w-none truncate" title={r.customer_name || 'N/A'}>{r.customer_name || 'N/A'}</td>
                    <td className="py-3 px-3 lg:px-4 text-xs sm:text-sm whitespace-nowrap">{r.scheduled_date || 'N/A'}</td>
                    <td className="py-3 px-3 lg:px-4 text-xs sm:text-sm whitespace-nowrap">{r.created_at?.split('T')[0] || 'N/A'}</td>
                    <td className="py-3 px-3 lg:px-4 text-xs sm:text-sm max-w-[100px] lg:max-w-none truncate" title={r.service}>{r.service}</td>
                    <td className="py-3 px-3 lg:px-4 text-xs sm:text-sm capitalize">{r.status}</td>
                    <td className="py-3 px-3 lg:px-4 text-xs sm:text-sm font-medium text-right whitespace-nowrap">${r.amount.toFixed(2)}</td>
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
