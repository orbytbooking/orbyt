import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { UserPlus, Users, Clipboard, Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import Link from "next/link";
import { format, isWithinInterval, parseISO, subDays, startOfMonth, endOfMonth } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { DateRange } from "react-day-picker";

const APPLICANTS_KEY = "hiringApplicants";

type HiringStage = "new" | "screening" | "interview" | "hired" | "rejected";

type Applicant = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  source: string;
  stage: HiringStage;
  createdAt: string;
};

export default function ReportsTab() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: undefined,
    to: undefined,
  });
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [userName, setUserName] = useState<string>("");
  const [showDateModal, setShowDateModal] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = JSON.parse(localStorage.getItem(APPLICANTS_KEY) || "[]") as Applicant[];
      if (Array.isArray(stored)) setApplicants(stored);
    } catch {
      // ignore
    }
  }, []);

  // Fetch user profile data to get the name
  useEffect(() => {
    const fetchUserName = async () => {
      try {
        const response = await fetch('/api/admin/profile');
        if (response.ok) {
          const data = await response.json();
          const profile = data.profile;
          if (profile?.full_name) {
            setUserName(profile.full_name);
          } else if (user?.user_metadata?.full_name) {
            setUserName(user.user_metadata.full_name);
          } else if (user?.email) {
            // Fallback to email with first part before @
            const emailName = user.email.split('@')[0];
            setUserName(emailName.charAt(0).toUpperCase() + emailName.slice(1));
          } else {
            setUserName("Admin");
          }
        }
      } catch (error) {
        console.error('Error fetching user name:', error);
        // Fallback to auth metadata or email
        if (user?.user_metadata?.full_name) {
          setUserName(user.user_metadata.full_name);
        } else if (user?.email) {
          const emailName = user.email.split('@')[0];
          setUserName(emailName.charAt(0).toUpperCase() + emailName.slice(1));
        } else {
          setUserName("Admin");
        }
      }
    };

    if (user) {
      fetchUserName();
    }
  }, [user]);

  // Filter applicants based on date range
  const filteredApplicants = applicants.filter((applicant) => {
    if (!dateRange.from && !dateRange.to) return true;
    
    const applicantDate = parseISO(applicant.createdAt);
    
    if (dateRange.from && dateRange.to) {
      return isWithinInterval(applicantDate, { start: dateRange.from, end: dateRange.to });
    } else if (dateRange.from) {
      return applicantDate >= dateRange.from;
    } else if (dateRange.to) {
      return applicantDate <= dateRange.to;
    }
    
    return true;
  });

  // Calculate metrics based on filtered data
  const prospects = filteredApplicants.filter((a) => a.stage === "new" || a.stage === "screening" || a.stage === "interview").length;
  const rejected = filteredApplicants.filter((a) => a.stage === "rejected").length;
  const onboarded = filteredApplicants.filter((a) => a.stage === "hired").length;

  // Get current time of day for greeting
  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  // Quick selection functions
  const setLast7Days = () => {
    const today = new Date();
    setDateRange({
      from: subDays(today, 6),
      to: today,
    });
  };

  const setLast30Days = () => {
    const today = new Date();
    setDateRange({
      from: subDays(today, 29),
      to: today,
    });
  };

  const setLastMonth = () => {
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    setDateRange({
      from: startOfMonth(lastMonth),
      to: endOfMonth(lastMonth),
    });
  };

  const setThisMonth = () => {
    const today = new Date();
    setDateRange({
      from: startOfMonth(today),
      to: endOfMonth(today),
    });
  };

  // Month and year selection functions
  const navigateToMonthYear = (month: number, year: number) => {
    setCalendarMonth(new Date(year, month, 1));
  };

  const selectMonthYear = (month: number, year: number) => {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0); // Last day of the month
    
    setDateRange({
      from: startDate,
      to: endDate,
    });
    setCalendarMonth(new Date(year, month, 1));
  };

  const clearDateRange = () => {
    setDateRange({ from: undefined, to: undefined });
    setCalendarMonth(new Date());
  };

  const applyDateRange = () => {
    setShowDateModal(false);
  };

  // Generate dynamic chart data based on filtered applicants
  const generateChartData = () => {
    // Group applicants by date periods
    const applicantsByDate = filteredApplicants.reduce((acc, applicant) => {
      const date = format(parseISO(applicant.createdAt), "MM/dd");
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(applicant);
      return acc;
    }, {} as Record<string, Applicant[]>);

    // Sort dates and create chart data
    const sortedDates = Object.keys(applicantsByDate).sort();
    
    return sortedDates.map(date => {
      const dailyApplicants = applicantsByDate[date];
      
      const dailyProspects = dailyApplicants.filter(
        (a) => a.stage === "new" || a.stage === "screening" || a.stage === "interview"
      ).length;
      const dailyRejected = dailyApplicants.filter((a) => a.stage === "rejected").length;
      const dailyOnboarded = dailyApplicants.filter((a) => a.stage === "hired").length;

      return {
        name: date,
        prospects: dailyProspects,
        rejected: dailyRejected,
        onboarded: dailyOnboarded,
      };
    });
  };

  // Calculate max value for Y-axis scaling
  const getMaxValue = () => {
    if (chartData.length === 0) return 5;
    const maxProspect = Math.max(...chartData.map(d => d.prospects || 0));
    const maxRejected = Math.max(...chartData.map(d => d.rejected || 0));
    const maxOnboarded = Math.max(...chartData.map(d => d.onboarded || 0));
    const maxValue = Math.max(maxProspect, maxRejected, maxOnboarded);
    return maxValue <= 0 ? 5 : maxValue + 2;
  };

  const chartData = generateChartData();
  const yAxisMax = getMaxValue();

  return (
    <div className="space-y-6">
      {/* Header with Greeting and Date Range */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {getTimeGreeting()}! {userName || "Admin"}
          </h1>
          <p className="text-sm text-muted-foreground">Here's what's happening with your hiring this week.</p>
        </div>
        <div className="flex items-center space-x-2">
          <Dialog open={showDateModal} onOpenChange={setShowDateModal}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[300px] justify-start text-left font-normal",
                  !dateRange?.from && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange?.to ? (
                    <>{format(dateRange.from, "MM/dd/yyyy")} - {format(dateRange.to, "MM/dd/yyyy")}</>
                  ) : (
                    format(dateRange.from, "MM/dd/yyyy")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Select Date Range</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium mb-3 block">Start Date</label>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 border rounded-md bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-[100px] justify-start text-left font-normal"
                              >
                                {format(calendarMonth, 'MMMM')}
                                <ChevronDown className="ml-2 h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <div className="grid grid-cols-3 gap-1 p-2">
                                {Array.from({ length: 12 }, (_, i) => (
                                  <Button
                                    key={i}
                                    variant={calendarMonth.getMonth() === i ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => {
                                      setCalendarMonth(new Date(calendarMonth.getFullYear(), i, 1));
                                    }}
                                    className="text-xs h-8 w-16 p-0"
                                  >
                                    {format(new Date(0, i), 'MMM')}
                                  </Button>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-[80px] justify-start text-left font-normal"
                              >
                                {calendarMonth.getFullYear()}
                                <ChevronDown className="ml-2 h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <div className="grid grid-cols-3 gap-1 p-2">
                                {[2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028].map((year) => (
                                  <Button
                                    key={year}
                                    variant={calendarMonth.getFullYear() === year ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => {
                                      setCalendarMonth(new Date(year, calendarMonth.getMonth(), 1));
                                    }}
                                    className="text-xs h-8 w-16 p-0"
                                  >
                                    {year}
                                  </Button>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                      <Calendar
                        mode="single"
                        selected={dateRange?.from}
                        onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                        className="rounded-md border text-xs"
                        month={calendarMonth}
                        onMonthChange={setCalendarMonth}
                        classNames={{
                          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                          month: "space-y-4",
                          caption: "flex justify-center pt-1 relative items-center",
                          caption_label: "text-sm font-medium",
                          nav: "space-x-1",
                          nav_button: "h-7 w-7",
                          table: "w-full border-collapse space-y-1",
                          head_row: "flex",
                          head_cell: "text-muted-foreground rounded-md w-8 font-normal text-[0.625rem]",
                          row: "flex w-full mt-2",
                          cell: "text-center p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l last:[&:has([aria-selected])]:rounded-r [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected].day-range-end)]:rounded-r [&:has([aria-selected].day-range-start)]:rounded-l",
                          day: "h-7 w-7 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground cursor-pointer rounded-md transition-colors",
                          day_range_end: "aria-selected:bg-accent aria-selected:text-primary",
                          day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground cursor-pointer",
                          day_today: "bg-accent text-accent-foreground hover:bg-accent/80 cursor-pointer",
                          day_outside: "text-muted-foreground opacity-50 hover:bg-accent/50 cursor-pointer",
                          day_disabled: "text-muted-foreground opacity-50 cursor-not-allowed",
                          day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                          day_hidden: "invisible",
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-3 block">End Date</label>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 border rounded-md bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-[100px] justify-start text-left font-normal"
                              >
                                {format(calendarMonth, 'MMMM')}
                                <ChevronDown className="ml-2 h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <div className="grid grid-cols-3 gap-1 p-2">
                                {Array.from({ length: 12 }, (_, i) => (
                                  <Button
                                    key={i}
                                    variant={calendarMonth.getMonth() === i ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => {
                                      setCalendarMonth(new Date(calendarMonth.getFullYear(), i, 1));
                                    }}
                                    className="text-xs h-8 w-16 p-0"
                                  >
                                    {format(new Date(0, i), 'MMM')}
                                  </Button>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-[80px] justify-start text-left font-normal"
                              >
                                {calendarMonth.getFullYear()}
                                <ChevronDown className="ml-2 h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <div className="grid grid-cols-3 gap-1 p-2">
                                {[2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028].map((year) => (
                                  <Button
                                    key={year}
                                    variant={calendarMonth.getFullYear() === year ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => {
                                      setCalendarMonth(new Date(year, calendarMonth.getMonth(), 1));
                                    }}
                                    className="text-xs h-8 w-16 p-0"
                                  >
                                    {year}
                                  </Button>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                      <Calendar
                        mode="single"
                        selected={dateRange?.to}
                        onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                        className="rounded-md border text-xs"
                        month={calendarMonth}
                        onMonthChange={setCalendarMonth}
                        classNames={{
                          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                          month: "space-y-4",
                          caption: "flex justify-center pt-1 relative items-center",
                          caption_label: "text-sm font-medium",
                          nav: "space-x-1",
                          nav_button: "h-7 w-7",
                          table: "w-full border-collapse space-y-1",
                          head_row: "flex",
                          head_cell: "text-muted-foreground rounded-md w-8 font-normal text-[0.625rem]",
                          row: "flex w-full mt-2",
                          cell: "text-center p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l last:[&:has([aria-selected])]:rounded-r [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected].day-range-end)]:rounded-r [&:has([aria-selected].day-range-start)]:rounded-l",
                          day: "h-7 w-7 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground cursor-pointer rounded-md transition-colors",
                          day_range_end: "aria-selected:bg-accent aria-selected:text-primary",
                          day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground cursor-pointer",
                          day_today: "bg-accent text-accent-foreground hover:bg-accent/80 cursor-pointer",
                          day_outside: "text-muted-foreground opacity-50 hover:bg-accent/50 cursor-pointer",
                          day_disabled: "text-muted-foreground opacity-50 cursor-not-allowed",
                          day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                          day_hidden: "invisible",
                        }}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <label className="text-sm font-medium">Quick Select</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <Button variant="outline" size="sm" onClick={setLast7Days}>
                      Last 7 Days
                    </Button>
                    <Button variant="outline" size="sm" onClick={setLast30Days}>
                      Last 30 Days
                    </Button>
                    <Button variant="outline" size="sm" onClick={setLastMonth}>
                      Last Month
                    </Button>
                    <Button variant="outline" size="sm" onClick={setThisMonth}>
                      This Month
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => {
                      const today = new Date();
                      setDateRange({
                        from: subDays(today, 90),
                        to: today,
                      });
                    }}>
                      Last 90 Days
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => {
                      const today = new Date();
                      setDateRange({
                        from: subDays(today, 365),
                        to: today,
                      });
                    }}>
                      Last Year
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => {
                      const today = new Date();
                      const lastWeek = new Date(today);
                      lastWeek.setDate(today.getDate() - 7);
                      setDateRange({
                        from: lastWeek,
                        to: today,
                      });
                    }}>
                      This Week
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => {
                      const today = new Date();
                      const startOfYear = new Date(today.getFullYear(), 0, 1);
                      const endOfYear = new Date(today.getFullYear(), 11, 31);
                      setDateRange({
                        from: startOfYear,
                        to: endOfYear,
                      });
                    }}>
                      This Year
                    </Button>
                  </div>
                </div>
                
                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={clearDateRange}>
                    Reset
                  </Button>
                  <div className="space-x-2">
                    <Button variant="outline" onClick={() => setShowDateModal(false)}>
                      Cancel
                    </Button>
                    <Button onClick={applyDateRange}>
                      Apply
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Prospects Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Prospects</p>
                <p className="text-3xl font-bold mt-1">{prospects}</p>
                <Link href="#" className="text-sm text-blue-600 hover:text-blue-800 mt-2 inline-block">
                  View all &gt;
                </Link>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <UserPlus className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rejected Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Rejected</p>
                <p className="text-3xl font-bold mt-1">{rejected}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-full">
                <Users className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Onboarded Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Onboarded</p>
                <p className="text-3xl font-bold mt-1">{onboarded}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <Clipboard className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Prospects</CardTitle>
          <CardDescription>
            Track your hiring pipeline over time with prospects, rejected, and onboarded candidates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, yAxisMax]} ticks={Array.from({length: yAxisMax + 1}, (_, i) => i)} />
                <Tooltip 
                  cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '8px 12px'
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="prospects" 
                  fill="#10b981" 
                  cursor="pointer"
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="rejected" 
                  fill="#ef4444" 
                  cursor="pointer"
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="onboarded" 
                  fill="#3b82f6" 
                  cursor="pointer"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
