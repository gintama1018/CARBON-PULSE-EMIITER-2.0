import ActivityLogForm from "@/components/activity-log-form";

export default function LogActivity() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Log Activity</h1>
        <p className="text-muted-foreground mt-1">Record your carbon footprint</p>
      </div>

      <div className="max-w-xl">
        <ActivityLogForm />
      </div>
    </div>
  );
}
