import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import NotFound from "@/pages/not-found";
import { setUserId } from "@workspace/api-client-react";

import Layout from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import LogActivity from "@/pages/log";
import Insights from "@/pages/insights";
import Goals from "@/pages/goals";
import Community from "@/pages/community";
import Settings from "@/pages/settings";

setUserId("demo-user");

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/log" component={LogActivity} />
        <Route path="/insights" component={Insights} />
        <Route path="/goals" component={Goals} />
        <Route path="/community" component={Community} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="carbonpulse-theme">
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
