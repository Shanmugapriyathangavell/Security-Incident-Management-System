import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, Clock, XCircle, TrendingUp, MapPin } from "lucide-react";

export const Analytics = () => {
  const { data: incidents } = useQuery({
    queryKey: ["incidents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incidents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const stats = {
    total: incidents?.length || 0,
    open: incidents?.filter((i) => i.status === "open").length || 0,
    inProgress: incidents?.filter((i) => i.status === "in_progress").length || 0,
    resolved: incidents?.filter((i) => i.status === "resolved").length || 0,
    closed: incidents?.filter((i) => i.status === "closed").length || 0,
    critical: incidents?.filter((i) => i.priority === "critical").length || 0,
    high: incidents?.filter((i) => i.priority === "high").length || 0,
  };

  const categoryStats = incidents?.reduce((acc: any, incident) => {
    acc[incident.category] = (acc[incident.category] || 0) + 1;
    return acc;
  }, {});

  const locationStats = incidents?.reduce((acc: any, incident) => {
    acc[incident.location] = (acc[incident.location] || 0) + 1;
    return acc;
  }, {});

  const topCategories = Object.entries(categoryStats || {})
    .sort(([, a]: any, [, b]: any) => b - a)
    .slice(0, 5);

  const topLocations = Object.entries(locationStats || {})
    .sort(([, a]: any, [, b]: any) => b - a)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open</CardTitle>
            <AlertTriangle className="h-4 w-4 text-status-open" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.open}</div>
            <p className="text-xs text-muted-foreground mt-1">Requires attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-status-in-progress" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground mt-1">Being handled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-status-resolved" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.resolved}</div>
            <p className="text-xs text-muted-foreground mt-1">Successfully handled</p>
          </CardContent>
        </Card>
      </div>

      {/* Priority Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Priority Breakdown</CardTitle>
            <CardDescription>Incidents by priority level</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Critical</span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-32 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-priority-critical"
                    style={{ width: `${(stats.critical / stats.total) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-bold w-8 text-right">{stats.critical}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">High</span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-32 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-priority-high"
                    style={{ width: `${(stats.high / stats.total) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-bold w-8 text-right">{stats.high}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status Overview</CardTitle>
            <CardDescription>Current incident status distribution</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Open</span>
              <span className="text-sm font-bold">{stats.open}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">In Progress</span>
              <span className="text-sm font-bold">{stats.inProgress}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Resolved</span>
              <span className="text-sm font-bold">{stats.resolved}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Closed</span>
              <span className="text-sm font-bold">{stats.closed}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Categories and Locations */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Categories</CardTitle>
            <CardDescription>Most common incident types</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topCategories.map(([category, count]: [string, any]) => (
              <div key={category} className="flex items-center justify-between">
                <span className="text-sm capitalize">{category.replace(/_/g, " ")}</span>
                <span className="text-sm font-bold">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <MapPin className="w-4 h-4 inline mr-2" />
              Top Locations
            </CardTitle>
            <CardDescription>Areas with most incidents</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topLocations.map(([location, count]: [string, any]) => (
              <div key={location} className="flex items-center justify-between">
                <span className="text-sm">{location}</span>
                <span className="text-sm font-bold">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
