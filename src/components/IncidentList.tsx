import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IncidentDetails } from "./IncidentDetails";
import { AlertCircle, Search, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const IncidentList = () => {
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const { data: incidents, isLoading } = useQuery({
    queryKey: ["incidents"],
    queryFn: async () => {
      const { data: incidentsData, error } = await supabase
        .from("incidents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch reporter profiles for all incidents
      const incidentsWithProfiles = await Promise.all(
        (incidentsData || []).map(async (incident) => {
          const { data: reporterData } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", incident.reporter_id)
            .single();

          let assignedData = null;
          if (incident.assigned_to) {
            const { data } = await supabase
              .from("profiles")
              .select("full_name, email")
              .eq("id", incident.assigned_to)
              .single();
            assignedData = data;
          }

          return {
            ...incident,
            reporter: reporterData,
            assigned: assignedData,
          };
        })
      );

      return incidentsWithProfiles;
    },
  });

  const filteredIncidents = incidents?.filter((incident) => {
    const matchesSearch = incident.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         incident.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || incident.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || incident.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "bg-priority-critical text-priority-critical-foreground";
      case "high": return "bg-priority-high text-priority-high-foreground";
      case "medium": return "bg-priority-medium text-priority-medium-foreground";
      case "low": return "bg-priority-low text-priority-low-foreground";
      default: return "bg-muted";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-status-open/10 text-status-open border-status-open";
      case "in_progress": return "bg-status-in-progress/10 text-status-in-progress border-status-in-progress";
      case "resolved": return "bg-status-resolved/10 text-status-resolved border-status-resolved";
      case "closed": return "bg-status-closed/10 text-status-closed border-status-closed";
      default: return "bg-muted";
    }
  };

  if (isLoading) {
    return <div className="text-center py-12">Loading incidents...</div>;
  }

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search incidents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Incidents Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredIncidents?.map((incident) => (
          <Card 
            key={incident.id} 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setSelectedIncidentId(incident.id)}
          >
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base truncate">{incident.title}</CardTitle>
                  <CardDescription className="text-xs mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}
                    </span>
                  </CardDescription>
                </div>
                <Badge className={getPriorityColor(incident.priority)}>
                  {incident.priority}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground line-clamp-2">
                {incident.description}
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className={getStatusColor(incident.status)}>
                  {incident.status.replace("_", " ")}
                </Badge>
                <Badge variant="secondary">{incident.category}</Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                <div>📍 {incident.location}</div>
                <div>Reporter: {incident.reporter?.full_name}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredIncidents?.length === 0 && (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No incidents found</h3>
            <p className="text-muted-foreground">
              Try adjusting your filters or search query
            </p>
          </CardContent>
        </Card>
      )}

      {/* Incident Details Dialog */}
      {selectedIncidentId && (
        <IncidentDetails
          incidentId={selectedIncidentId}
          open={!!selectedIncidentId}
          onOpenChange={(open) => !open && setSelectedIncidentId(null)}
        />
      )}
    </>
  );
};
