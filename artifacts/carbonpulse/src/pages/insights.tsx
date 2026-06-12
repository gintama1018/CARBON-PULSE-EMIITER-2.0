import { useGetLatestInsight, useListInsights, useGetActivityTrend, useGenerateInsight, getGetLatestInsightQueryKey, getListInsightsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Zap, TrendingDown } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function Insights() {
  const { data: latestInsight, isLoading: loadingLatest } = useGetLatestInsight();
  const { data: insightsList, isLoading: loadingList } = useListInsights();
  const { data: trendData } = useGetActivityTrend();
  
  const generateInsight = useGenerateInsight();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleGenerate = () => {
    generateInsight.mutate(undefined, {
      onSuccess: () => {
        toast({ title: "Insight Generated", description: "AI has analyzed your recent activity." });
        queryClient.invalidateQueries({ queryKey: getGetLatestInsightQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListInsightsQueryKey() });
      }
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Insights</h1>
          <p className="text-muted-foreground mt-1">Intelligence derived from your carbon footprint</p>
        </div>
        <Button 
          onClick={handleGenerate} 
          disabled={generateInsight.isPending}
          className="bg-primary/20 text-primary hover:bg-primary/30"
        >
          <Zap className="mr-2 h-4 w-4" />
          {generateInsight.isPending ? "Analyzing..." : "Generate New Insight"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {loadingLatest ? (
            <Skeleton className="h-64 w-full" />
          ) : latestInsight ? (
            <Card className="bg-card/50 backdrop-blur border-border border-l-4 border-l-primary">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Latest Analysis</span>
                  <span className="text-xs px-2 py-1 bg-secondary rounded-full text-muted-foreground">
                    Driver: {latestInsight.primaryDriver}
                  </span>
                </CardTitle>
                <CardDescription>Generated for week of {latestInsight.weekStartDate}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-lg leading-relaxed">{latestInsight.insightText}</p>
                <div className="bg-secondary/50 p-4 rounded-lg flex items-start gap-4">
                  <TrendingDown className="h-6 w-6 text-primary shrink-0 mt-1" />
                  <div>
                    <div className="font-medium text-foreground">Suggested Action</div>
                    <div className="text-muted-foreground">{latestInsight.suggestedAction}</div>
                    <div className="mt-2 text-sm text-primary font-medium">
                      Projected saving: {latestInsight.projectedSavingKgYear} kg/year
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card/50 backdrop-blur border-border">
              <CardContent className="py-12 text-center text-muted-foreground">
                No insights available yet. Log some activities and generate your first insight!
              </CardContent>
            </Card>
          )}

          <Card className="bg-card/50 backdrop-blur border-border">
            <CardHeader>
              <CardTitle>30-Day Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full">
                {trendData ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="colorCo2" x1="0" y1="0" x2="0" y2="1">
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
                        fill="url(#colorCo2)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <Skeleton className="h-full w-full" />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <h3 className="font-semibold text-lg">History</h3>
          <div className="space-y-4">
            {loadingList ? (
              <>
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </>
            ) : insightsList && insightsList.length > 0 ? (
              insightsList.map(insight => (
                <Card key={insight.id} className="bg-card/30 border-border/50">
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground mb-1">{insight.weekStartDate}</div>
                    <div className="text-sm font-medium line-clamp-2">{insight.insightText}</div>
                    <div className="mt-2 text-xs text-primary">-{insight.projectedSavingKgYear} kg/yr</div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">No historical insights.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
