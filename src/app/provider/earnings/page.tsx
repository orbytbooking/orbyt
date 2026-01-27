"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  DollarSign, 
  TrendingUp, 
  Calendar,
  Download,
  CreditCard,
  CheckCircle2,
  ArrowUpDown,
  ChevronDown,
  MoreHorizontal,
  Search,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const stats = [
  {
    title: "Total Earnings",
    value: "$3,450",
    change: "+15.2%",
    icon: DollarSign,
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900/20"
  },
  {
    title: "This Month",
    value: "$1,250",
    change: "+8.5%",
    icon: Calendar,
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/20"
  },
  {
    title: "Pending Payout",
    value: "$450",
    change: "3 jobs",
    icon: CreditCard,
    color: "text-orange-600",
    bgColor: "bg-orange-100 dark:bg-orange-900/20"
  },
  {
    title: "Average per Job",
    value: "$123",
    change: "+5.2%",
    icon: TrendingUp,
    color: "text-cyan-600",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/20"
  },
];

const earningsHistory = [
  {
    id: "PAY001",
    date: "2024-12-05",
    customer: "Lisa Anderson",
    service: "Move In/Out Cleaning",
    amount: "$350",
    status: "paid",
    paymentMethod: "Bank Transfer"
  },
  {
    id: "PAY002",
    date: "2024-12-04",
    customer: "David Brown",
    service: "Deep Cleaning",
    amount: "$250",
    status: "paid",
    paymentMethod: "Bank Transfer"
  },
  {
    id: "PAY003",
    date: "2024-12-03",
    customer: "Michael Wilson",
    service: "Standard Cleaning",
    amount: "$120",
    status: "paid",
    paymentMethod: "Bank Transfer"
  },
  {
    id: "PAY004",
    date: "2024-12-02",
    customer: "Emma Davis",
    service: "Office Cleaning",
    amount: "$200",
    status: "paid",
    paymentMethod: "Bank Transfer"
  },
  {
    id: "PAY005",
    date: "2024-12-01",
    customer: "James Taylor",
    service: "Carpet Cleaning",
    amount: "$150",
    status: "paid",
    paymentMethod: "Bank Transfer"
  },
  {
    id: "PEND001",
    customer: {
      name: "Sarah Johnson",
      email: "sarah.johnson@example.com",
      phone: "555-555-5555"
    },
    service: "Deep Cleaning",
    date: "2024-12-07",
    time: "2:00 PM",
    status: "pending",
    amount: "$250",
    location: "666 Cedar St",
    paymentMethod: "Pending"
  },
  {
    id: "PEND002",
    customer: {
      name: "Mike Davis",
      email: "mike.davis@example.com",
      phone: "777-777-7777"
    },
    service: "Standard Cleaning",
    date: "2024-12-07",
    time: "10:00 AM",
    status: "pending",
    amount: "$120",
    location: "888 Walnut St",
    paymentMethod: "Pending"
  },
  {
    id: "PEND003",
    customer: {
      name: "Robert Wilson",
      email: "robert.wilson@example.com",
      phone: "999-999-9999"
    },
    service: "Carpet Cleaning",
    date: "2024-12-08",
    time: "2:00 PM",
    status: "pending",
    amount: "$150",
    location: "1010 Cherry St",
    paymentMethod: "Pending"
  },
];

const monthlyBreakdown = [
  { month: "November 2024", earnings: "$2,200", jobs: 18 },
  { month: "October 2024", earnings: "$1,950", jobs: 16 },
  { month: "September 2024", earnings: "$2,100", jobs: 17 },
  { month: "August 2024", earnings: "$1,800", jobs: 15 },
];

const ProviderEarnings = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredEarnings = earningsHistory.filter((earning) => {
    const matchesSearch = 
      (typeof earning.customer === 'string' ? earning.customer : earning.customer.name)
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      earning.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
      earning.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = 
      statusFilter === "all" || earning.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header with Search and Filter */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Earnings</h1>
            <p className="text-muted-foreground">Track your income and payment history</p>
          </div>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-600 font-medium">{stat.change}</span> from last month
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Earnings History */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Earnings History</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Recent payments and pending payouts
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative w-56">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search earnings..."
                    className="pl-9 w-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEarnings.length > 0 ? (
                    filteredEarnings.map((earning) => (
                    <TableRow key={earning.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{new Date(earning.date).toLocaleDateString()}</span>
                          <span className="text-xs text-muted-foreground">
                            {earning.id}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {typeof earning.customer === 'string' 
                            ? earning.customer 
                            : earning.customer.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {earning.service}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          <span>{earning.paymentMethod}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {earning.amount}
                      </TableCell>
                      <TableCell>
                        <span className={`
                          inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${earning.status === 'paid' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                            : 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
                          }
                        `}>
                          {earning.status === 'paid' ? 'Paid' : 'Pending'}
                        </span>
                      </TableCell>
                    </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        No earnings found matching your criteria.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Breakdown</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Earnings by month
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {monthlyBreakdown.map((month, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{month.month}</p>
                    <p className="text-sm font-bold">{month.earnings}</p>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{month.jobs} completed jobs</span>
                    <span>${(parseFloat(month.earnings.replace('$', '').replace(',', '')) / month.jobs).toFixed(0)} avg</span>
                  </div>
                  {index < monthlyBreakdown.length - 1 && (
                    <div className="border-b border-border pt-2" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProviderEarnings;
