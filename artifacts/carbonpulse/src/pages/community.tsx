import { useGetCommunityStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Community() {
  const { data: stats, isLoading } = useGetCommunityStats();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Community</h1>
        <p className="text-muted-foreground mt-1">See how you compare to the global pulse</p>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : stats ? (
        <div className="space-y-6">
          <Card className="bg-card/50 backdrop-blur border-border bg-gradient-to-br from-primary/10 to-transparent">
            <CardContent className="pt-6 text-center py-12">
              <div className="text-5xl font-bold text-primary mb-4">{stats.userPercentile}%</div>
              <h2 className="text-xl font-medium">You emit less than {stats.userPercentile}% of users</h2>
              <p className="text-muted-foreground mt-2">in the {stats.regionLabel} region</p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-card/50 backdrop-blur border-border">
              <CardHeader>
                <CardTitle>Weekly Average Comparison</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium">You</span>
                    <span className="font-mono">{stats.userWeekKg.toFixed(1)} kg</span>
                  </div>
                  <div className="w-full bg-secondary h-4 rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: '40%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium">Community Average</span>
                    <span className="font-mono">{stats.globalAvgKg.toFixed(1)} kg</span>
                  </div>
                  <div className="w-full bg-secondary h-4 rounded-full overflow-hidden">
                    <div className="h-full bg-muted-foreground" style={{ width: '60%' }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur border-border">
              <CardHeader>
                <CardTitle>Category Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.categoryAverages.map(cat => (
                    <div key={cat.category}>
                      <div className="flex justify-between text-sm mb-1 capitalize">
                        <span>{cat.category}</span>
                        <span className="text-muted-foreground">
                          {cat.userKg.toFixed(1)} / {cat.avgKg.toFixed(1)} kg
                        </span>
                      </div>
                      <div className="w-full h-2 bg-secondary rounded-full overflow-hidden flex">
                        <div 
                          className="h-full bg-primary" 
                          style={{ width: `${(cat.userKg / (cat.userKg + cat.avgKg)) * 100}%` }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="text-muted-foreground">Failed to load community stats.</div>
      )}
    </div>
  );
}
