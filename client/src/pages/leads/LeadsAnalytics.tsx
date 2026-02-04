/**
 * Leads Analytics Dashboard
 *
 * Provides detailed analytics and visualizations for lead data.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  TrendingUp,
  TrendingDown,
  Users,
  CheckCircle2,
  XCircle,
  BarChart3,
  PieChart,
  Activity,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface LeadsAnalyticsProps {
  siteId: string;
}

interface LeadAnalytics {
  monthlyData: Array<{
    month: string;
    label: string;
    total: number;
    signedUp: number;
    notSignedUp: number;
    conversionRate: number;
  }>;
  bySource: Array<{ name: string; value: number; percentage: number }>;
  byOutcome: Array<{ name: string; value: number; percentage: number }>;
  byReason: Array<{ name: string; value: number; percentage: number }>;
  byServiceLine: Array<{ name: string; value: number; percentage: number }>;
  totalLeads: number;
  totalSignedUp: number;
  totalNotSignedUp: number;
  overallConversionRate: number;
  currentMonthLeads: number;
  previousMonthLeads: number;
  monthOverMonthChange: number;
}

// Color palette for charts
const COLORS = [
  "#8b5cf6", // violet
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#ec4899", // pink
  "#6366f1", // indigo
  "#14b8a6", // teal
  "#f97316", // orange
  "#84cc16", // lime
];

// Labels for display
const SOURCE_LABELS: Record<string, string> = {
  short_form: "Short Form",
  long_form: "Long Form",
  phone: "Phone",
  sms: "SMS",
  form_submit: "Form Submit",
  phone_click: "Phone Click",
  manual: "Manual",
};

const OUTCOME_LABELS: Record<string, string> = {
  signed_up: "Signed Up",
  not_signed_up: "Not Signed Up",
  unknown: "Pending",
};

const REASON_LABELS: Record<string, string> = {
  spam: "Spam/Wrong Number",
  did_not_respond: "Did Not Respond",
  no_answer: "No Answer",
  medicaid: "Medicaid",
  private_pay_expensive: "Can't Afford",
  hmo_low_payer: "HMO/Low Payer",
  requires_md: "Requires MD/Inpatient",
  general_information: "General Information",
  same_day_appointment: "Same Day Request",
  no_availability: "No Availability",
  benzos_request: "Benzos Request",
  other: "Other",
};

const SERVICE_LABELS: Record<string, string> = {
  psych_evaluation: "Psych Evaluation",
  therapy: "Therapy",
  medication_management: "Med Management",
  adhd: "ADHD",
  esa: "ESA",
  suboxone: "Suboxone",
  general_inquiry: "General Inquiry",
  other: "Other",
};

async function fetchAnalytics(siteId: string): Promise<LeadAnalytics> {
  const res = await fetch(`/api/leads/analytics?siteId=${siteId}&months=12`);
  if (!res.ok) throw new Error("Failed to fetch analytics");
  return res.json();
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendLabel,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: typeof Users;
  trend?: number;
  trendLabel?: string;
}) {
  const isPositive = (trend ?? 0) >= 0;

  return (
    <Card className="bg-white border-border/50">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
            {trend !== undefined && (
              <div className="flex items-center gap-1 mt-2">
                {isPositive ? (
                  <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-500" />
                )}
                <span
                  className={`text-sm font-medium ${isPositive ? "text-emerald-600" : "text-red-600"}`}
                >
                  {Math.abs(trend).toFixed(1)}%
                </span>
                {trendLabel && (
                  <span className="text-xs text-muted-foreground ml-1">
                    {trendLabel}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function LeadsAnalytics({ siteId }: LeadsAnalyticsProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["leads-analytics", siteId],
    queryFn: () => fetchAnalytics(siteId),
    enabled: !!siteId,
  });

  // Format data for charts
  const sourceData = useMemo(() => {
    if (!data?.bySource) return [];
    return data.bySource.slice(0, 6).map((item) => ({
      name: SOURCE_LABELS[item.name] || item.name,
      value: item.value,
      percentage: item.percentage,
    }));
  }, [data?.bySource]);

  const outcomeData = useMemo(() => {
    if (!data?.byOutcome) return [];
    return data.byOutcome.map((item) => ({
      name: OUTCOME_LABELS[item.name] || item.name,
      value: item.value,
      percentage: item.percentage,
    }));
  }, [data?.byOutcome]);

  const reasonData = useMemo(() => {
    if (!data?.byReason) return [];
    return data.byReason.slice(0, 8).map((item) => ({
      name: REASON_LABELS[item.name] || item.name,
      value: item.value,
      percentage: item.percentage,
    }));
  }, [data?.byReason]);

  const serviceData = useMemo(() => {
    if (!data?.byServiceLine) return [];
    return data.byServiceLine.slice(0, 6).map((item) => ({
      name: SERVICE_LABELS[item.name] || item.name,
      value: item.value,
      percentage: item.percentage,
    }));
  }, [data?.byServiceLine]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Failed to load analytics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Leads"
          value={data.totalLeads.toLocaleString()}
          subtitle="Last 12 months"
          icon={Users}
        />
        <StatCard
          title="Signed Up"
          value={data.totalSignedUp.toLocaleString()}
          subtitle={`${data.overallConversionRate.toFixed(1)}% conversion`}
          icon={CheckCircle2}
        />
        <StatCard
          title="Not Signed Up"
          value={data.totalNotSignedUp.toLocaleString()}
          subtitle="See reasons below"
          icon={XCircle}
        />
        <StatCard
          title="This Month"
          value={data.currentMonthLeads.toLocaleString()}
          icon={Activity}
          trend={data.monthOverMonthChange}
          trendLabel="vs last month"
        />
      </div>

      {/* Monthly Trend Chart */}
      <Card className="bg-white border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="w-5 h-5 text-primary" />
            Leads Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.monthlyData}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorSignedUp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) => v.split(" ")[0].slice(0, 3)}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number, name: string) => [
                    value,
                    name === "total" ? "Total Leads" : "Signed Up",
                  ]}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="total"
                  name="Total Leads"
                  stroke="#8b5cf6"
                  fill="url(#colorTotal)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="signedUp"
                  name="Signed Up"
                  stroke="#10b981"
                  fill="url(#colorSignedUp)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Breakdown Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Sources */}
        <Card className="bg-white border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              Lead Sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    width={100}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [value, "Leads"]}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Outcomes Pie Chart */}
        <Card className="bg-white border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChart className="w-5 h-5 text-violet-500" />
              Outcomes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={outcomeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percentage }) =>
                      `${name} (${percentage.toFixed(0)}%)`
                    }
                    labelLine={{ stroke: "#94a3b8", strokeWidth: 1 }}
                  >
                    {outcomeData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          index === 0
                            ? "#10b981"
                            : index === 1
                              ? "#ef4444"
                              : "#94a3b8"
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                  />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reasons and Services */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* No Signup Reasons */}
        <Card className="bg-white border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <XCircle className="w-5 h-5 text-red-500" />
              Why Leads Didn't Sign Up
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reasonData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-3">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">
                        {item.name}
                      </span>
                      <span className="text-sm text-muted-foreground flex-shrink-0">
                        {item.value} ({item.percentage.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="mt-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              {reasonData.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No data available
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Service Lines */}
        <Card className="bg-white border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              Services Requested
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={serviceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [value, "Leads"]}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {serviceData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Rate Trend */}
      <Card className="bg-white border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="w-5 h-5 text-amber-500" />
            Monthly Conversion Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.monthlyData}>
                <defs>
                  <linearGradient id="colorConversion" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) => v.split(" ")[0].slice(0, 3)}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) => `${v}%`}
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, "Conversion Rate"]}
                />
                <Area
                  type="monotone"
                  dataKey="conversionRate"
                  name="Conversion Rate"
                  stroke="#f59e0b"
                  fill="url(#colorConversion)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
