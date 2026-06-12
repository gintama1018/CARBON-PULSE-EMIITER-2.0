import { useListGoals, useGetGoalProgress } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Goals() {
  const { data: goals, isLoading: loadingGoals } = useListGoals();
  const { data: progress, isLoading: loadingProgress } = useGetGoalProgress();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Goals</h1>
        <p className="text-muted-foreground mt-1">Track and manage your carbon reduction targets</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card/50 backdrop-blur border-border">
          <CardHeader>
            <CardTitle>Current Weekly Target</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingProgress ? (
              <Skeleton className="h-32 w-full" />
            ) : progress?.hasGoal ? (
              <div className="space-y-4">
                <div className="text-4xl font-bold font-mono">
                  {progress.currentKg.toFixed(1)} <span className="text-xl text-muted-foreground font-sans">/ {progress.targetKgPerWeek} kg</span>
                </div>
                <div className="w-full bg-secondary h-4 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${progress.onTrack ? 'bg-primary' : 'bg-amber-500'}`} 
                    style={{ width: `${Math.min(progress.percentUsed, 100)}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  {progress.onTrack 
                    ? `On track! You have ${progress.remainingKg.toFixed(1)} kg remaining.` 
                    : "Warning: Approaching or exceeding target budget."}
                </p>
              </div>
            ) : (
              <div className="text-muted-foreground">No active weekly goal set.</div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-border">
          <CardHeader>
            <CardTitle>Goal History</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingGoals ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : goals && goals.length > 0 ? (
              <div className="space-y-4">
                {goals.map(goal => (
                  <div key={goal.id} className="flex justify-between items-center p-3 rounded-md bg-secondary/30">
                    <div>
                      <div className="font-medium">{goal.targetKgPerWeek} kg/week</div>
                      <div className="text-xs text-muted-foreground">
                        {goal.category ? `Category: ${goal.category}` : "Overall"} • Started {goal.startDate}
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs ${goal.isActive ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      {goal.isActive ? "Active" : "Completed"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground">No goals found.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
