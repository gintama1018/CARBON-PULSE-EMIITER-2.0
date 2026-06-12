import { useGetMe, useUpdateMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/components/theme-provider";

export default function Settings() {
  const { data: user, isLoading } = useGetMe();
  const updateMe = useUpdateMe();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  const [displayName, setDisplayName] = useState("");
  const [budget, setBudget] = useState(100);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      setBudget(user.weeklyBudgetKg || 100);
    }
  }, [user]);

  const handleSave = () => {
    updateMe.mutate({
      data: {
        displayName,
        weeklyBudgetKg: budget
      }
    }, {
      onSuccess: () => {
        toast({ title: "Settings saved", description: "Your profile has been updated." });
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      }
    });
  };

  if (isLoading) {
    return <Skeleton className="h-64 w-full max-w-xl mt-8" />;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your profile and preferences</p>
      </div>

      <div className="max-w-xl space-y-6">
        <Card className="bg-card/50 backdrop-blur border-border">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input 
                id="displayName" 
                value={displayName} 
                onChange={(e) => setDisplayName(e.target.value)} 
                className="bg-secondary/50"
              />
            </div>
            
            <div className="space-y-4 pt-4">
              <div className="flex justify-between">
                <Label>Weekly Budget Target</Label>
                <span className="font-mono font-medium">{budget} kg</span>
              </div>
              <Slider 
                value={[budget]} 
                onValueChange={(v) => setBudget(v[0])} 
                max={300} 
                step={5} 
              />
              <p className="text-xs text-muted-foreground">
                Set a realistic target to challenge yourself.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-border">
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button 
                variant={theme === "light" ? "default" : "outline"} 
                onClick={() => setTheme("light")}
              >
                Light
              </Button>
              <Button 
                variant={theme === "dark" ? "default" : "outline"} 
                onClick={() => setTheme("dark")}
              >
                Dark
              </Button>
              <Button 
                variant={theme === "system" ? "default" : "outline"} 
                onClick={() => setTheme("system")}
              >
                System
              </Button>
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={updateMe.isPending} className="w-full">
          {updateMe.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
