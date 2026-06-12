import { useState } from "react";
import { useCreateActivity, usePreviewTransport, getGetActivitySummaryQueryKey, getGetActivityHeatmapQueryKey, getListActivitiesQueryKey, getGetActivityTrendQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Car, Leaf, Zap, ShoppingBag, Trash2, MapPin, Icon } from "lucide-react";

const CATEGORIES = [
  { id: "transport", label: "Transport", icon: Car },
  { id: "food", label: "Food", icon: Leaf },
  { id: "energy", label: "Energy", icon: Zap },
  { id: "shopping", label: "Shopping", icon: ShoppingBag },
  { id: "waste", label: "Waste", icon: Trash2 },
];

export default function ActivityLogForm() {
  const [category, setCategory] = useState("transport");
  const [subcategory, setSubcategory] = useState("");
  const [quantity, setQuantity] = useState("10");
  
  const createActivity = useCreateActivity();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleLog = () => {
    createActivity.mutate({
      data: {
        category,
        subcategory: subcategory || (category === "transport" ? "car" : "general"),
        quantity: parseFloat(quantity) || 1,
        unit: category === "transport" ? "km" : "unit",
        description: "Logged from web"
      }
    }, {
      onSuccess: () => {
        toast({ title: "Activity logged", description: "Your carbon footprint has been updated." });
        queryClient.invalidateQueries({ queryKey: getGetActivitySummaryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetActivityTrendQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetActivityHeatmapQueryKey() });
        setQuantity("10");
        setSubcategory("");
      }
    });
  }

  return (
    <Card className="bg-card/50 backdrop-blur border-border">
      <CardHeader>
        <CardTitle>Log New Activity</CardTitle>
        <CardDescription>Select a category and enter details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Category</Label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {CATEGORIES.map(c => {
              const Icon = c.icon;
              const isSelected = category === c.id;
              return (
                <button 
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                    isSelected 
                      ? 'border-primary bg-primary/10 text-primary' 
                      : 'border-border bg-card hover:bg-secondary text-muted-foreground'
                  }`}
                >
                  <Icon className="h-6 w-6 mb-2" />
                  <span className="text-xs font-medium">{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {category === "transport" && (
          <div className="bg-secondary/30 p-4 rounded-lg space-y-4 border border-border">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" /> Route Preview
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Distance (km)</Label>
                <Input 
                  type="number" 
                  value={quantity} 
                  onChange={(e) => setQuantity(e.target.value)} 
                  placeholder="e.g. 15"
                />
              </div>
              <div className="space-y-2">
                <Label>Mode</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                >
                  <option value="car">Car (Gasoline)</option>
                  <option value="motorcycle">Motorcycle</option>
                  <option value="bus">Bus</option>
                  <option value="metro">Metro/Train</option>
                  <option value="bicycle">Bicycle</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {category !== "transport" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input 
                type="number" 
                value={quantity} 
                onChange={(e) => setQuantity(e.target.value)} 
                placeholder="Amount"
              />
            </div>
            <div className="space-y-2">
              <Label>Subcategory (Optional)</Label>
              <Input 
                type="text" 
                value={subcategory} 
                onChange={(e) => setSubcategory(e.target.value)} 
                placeholder="e.g. Beef, Electricity"
              />
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleLog} 
          disabled={createActivity.isPending}
          className="w-full py-6 text-lg"
        >
          {createActivity.isPending ? "Logging..." : "Log Activity"}
        </Button>
      </CardFooter>
    </Card>
  );
}
