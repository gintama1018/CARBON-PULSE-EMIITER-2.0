import React from "react";
import { useGetActivitySummary, useGetMe, useGetActivityTrend, useGetStreak, useGetLatestInsight } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Link } from "wouter";
import { Area, AreaChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { type LucideIcon, type LucideProps, Zap, Flame, Leaf, Zap as EnergyIcon, ShoppingBag, Trash2, Car } from "lucide-react";
import { format } from "date-fns";
import { gramsToKg } from "@/lib/units";

const CATEGORY_COLORS: Record<string, string> = {
  transport: "hsl(var(--chart-2))", // blue/sky
  food: "hsl(var(--chart-1))",      // green/emerald
  energy: "hsl(var(--chart-3))",    // amber/orange
  shopping: "hsl(var(--chart-4))",  // purple/violet
  waste: "hsl(var(--chart-5))",     // red/rose
};

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  transport: Car,
  food: Leaf,
  energy: EnergyIcon,
  shopping: ShoppingBag,
  waste: Trash2,
};

export default function Dashboard() {
  const { data: user, isLoading: loadingUser } = useGetMe();
  const { data: summary, isLoading: loadingSummary } = useGetActivitySummary();
  const { data: streak } = useGetStreak();
  const { data: insight } = useGetLatestInsight();
  const { data: trend } = useGetActivityTrend();

  if (loadingUser || loadingSummary) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  const chartData = summary?.categoryBreakdown?.map(c => ({
    name: c.category,
    value: c.co2Kg,
    color: CATEGORY_COLORS[c.category] || "hsl(var(--primary))"
  })) || [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mission Control</h1>
          <p className="text-muted-foreground mt-1 text-sm font-mono">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Link href="/log">
          <button className="bg-primary text-primary-foreground px-6 py-2 rounded-full font-medium shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all hover:-translate-y-0.5 cursor-pointer">
            Log Activity
          </button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card/50 backdrop-blur border-border relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Today's Pulse</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold font-mono tracking-tighter text-foreground">
              {summary?.todayKg.toFixed(1)} <span className="text-xl text-muted-foreground font-sans">kg CO₂</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {summary?.todayKg === 0 ? "No emissions logged today." : "On track."}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 backdrop-blur border-border relative">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Weekly Budget</CardTitle>
            {streak?.currentStreak ? (
              <div className="flex items-center text-orange-500 font-bold text-sm bg-orange-500/10 px-2 py-1 rounded-full">
                <Flame className="w-3 h-3 mr-1" />
                {streak.currentStreak} Day Streak
              </div>
            ) : null}
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold font-mono tracking-tighter">
              {summary?.weekKg.toFixed(1)} <span className="text-xl text-muted-foreground font-sans">/ {summary?.weekBudgetKg}</span>
            </div>
            <div className="w-full bg-secondary h-2 rounded-full mt-3 overflow-hidden">
              <div 
                className="h-full transition-all duration-1000 ease-out" 
                style={{ 
                  width: `${Math.min(summary?.weekPercentUsed || 0, 100)}%`,
                  backgroundColor: summary?.weekPercentUsed && summary.weekPercentUsed > 90 ? "hsl(var(--destructive))" : 
                                   summary?.weekPercentUsed && summary.weekPercentUsed > 70 ? "hsl(var(--chart-3))" : 
                                   "hsl(var(--primary))"
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Top Driver</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize flex items-center gap-2">
              {summary?.topCategory ? (
                <>
                  {CATEGORY_ICONS[summary.topCategory] && React.createElement(CATEGORY_ICONS[summary.topCategory], { className: "w-6 h-6 text-muted-foreground" })}
                  {summary.topCategory}
                </>
              ) : "None"}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Largest source of emissions this week.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 bg-card/50 backdrop-blur border-border">
          <CardHeader>
            <CardTitle>30-Day Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full">
              {trend ? (
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={trend}>
                    <defs>
                      <linearGradient id="colorCo2Dash" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" hide />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="co2Kg" 
                      stroke="hsl(var(--primary))" 
                      fillOpacity={1} 
                      fill="url(#colorCo2Dash)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">No trend data</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-border">
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">No data</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {insight && (
          <Card className="bg-card/50 backdrop-blur border-border border-l-4 border-l-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Latest Insight
              </CardTitle>
              <CardDescription>Driver: {insight.primaryDriver}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">{insight.insightText}</p>
              <Link href="/insights" className="text-primary text-sm font-medium hover:underline">
                View all insights →
              </Link>
            </CardContent>
          </Card>
        )}
        
        <Card className="bg-card/50 backdrop-blur border-border">
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {summary?.recentActivities?.slice(0, 5).map(act => {
                const Icon = CATEGORY_ICONS[act.category] || ActivityIcon;
                return (
                  <div key={act.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium capitalize">{act.subcategory || act.category}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(act.loggedAt), 'MMM d, yyyy')}</p>
                      </div>
                    </div>
                    <div className="text-sm font-mono font-medium">
                      +{gramsToKg(act.co2Grams).toFixed(1)} kg
                    </div>
                  </div>
                );
              })}
              {!summary?.recentActivities?.length && (
                <p className="text-sm text-muted-foreground">No recent activities.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/** Fallback icon used when a category has no mapped Lucide icon */
function ActivityIcon(props: LucideProps) {
  return <Zap {...props} />;
}
