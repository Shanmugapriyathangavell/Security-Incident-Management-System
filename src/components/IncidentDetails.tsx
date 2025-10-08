import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Calendar, MapPin, User, Clock, MessageSquare } from "lucide-react";

interface IncidentDetailsProps {
  incidentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const IncidentDetails = ({ incidentId, open, onOpenChange }: IncidentDetailsProps) => {
  const [newUpdate, setNewUpdate] = useState("");
  const [statusUpdate, setStatusUpdate] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: incident } = useQuery({
    queryKey: ["incident", incidentId],
    queryFn: async () => {
      const { data: incidentData, error } = await supabase
        .from("incidents")
        .select("*")
        .eq("id", incidentId)
        .single();

      if (error) throw error;

      // Fetch reporter profile
      const { data: reporterData } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", incidentData.reporter_id)
        .single();

      // Fetch assigned profile if exists
      let assignedData = null;
      if (incidentData.assigned_to) {
        const { data } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", incidentData.assigned_to)
          .single();
        assignedData = data;
      }

      return {
        ...incidentData,
        reporter: reporterData,
        assigned: assignedData,
      };
    },
    enabled: !!incidentId,
  });

  const { data: updates } = useQuery({
    queryKey: ["incident-updates", incidentId],
    queryFn: async () => {
      const { data: updatesData, error } = await supabase
        .from("incident_updates")
        .select("*")
        .eq("incident_id", incidentId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch user profiles for each update
      const updatesWithProfiles = await Promise.all(
        (updatesData || []).map(async (update) => {
          const { data: userData } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", update.user_id)
            .single();

          return {
            ...update,
            user: userData,
          };
        })
      );

      return updatesWithProfiles;
    },
    enabled: !!incidentId,
  });

  const updateStatus = useMutation({
    mutationFn: async (status: "open" | "in_progress" | "resolved" | "closed") => {
      const { error } = await supabase
        .from("incidents")
        .update({ 
          status: status as any,
          resolved_at: status === "resolved" ? new Date().toISOString() : null
        })
        .eq("id", incidentId);

      if (error) throw error;

      // Add update entry
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("incident_updates").insert({
        incident_id: incidentId,
        user_id: user?.id,
        update_type: "status_change",
        content: `Status changed to: ${status}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incident", incidentId] });
      queryClient.invalidateQueries({ queryKey: ["incident-updates", incidentId] });
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      toast({ title: "Status updated" });
    },
  });

  const addUpdate = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("incident_updates").insert({
        incident_id: incidentId,
        user_id: user?.id,
        update_type: "comment",
        content: newUpdate,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incident-updates", incidentId] });
      setNewUpdate("");
      toast({ title: "Update added" });
    },
  });

  if (!incident) return null;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "bg-priority-critical text-priority-critical-foreground";
      case "high": return "bg-priority-high text-priority-high-foreground";
      case "medium": return "bg-priority-medium text-priority-medium-foreground";
      case "low": return "bg-priority-low text-priority-low-foreground";
      default: return "bg-muted";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <DialogTitle className="text-2xl">{incident.title}</DialogTitle>
            <Badge className={getPriorityColor(incident.priority)}>
              {incident.priority}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Update */}
          <div className="flex gap-2">
            <Select 
              value={statusUpdate || incident.status} 
              onValueChange={(value) => {
                const typedValue = value as "open" | "in_progress" | "resolved" | "closed";
                setStatusUpdate(typedValue);
                updateStatus.mutate(typedValue);
              }}
            >
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Incident Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Created:</span>
              <span>{format(new Date(incident.created_at), "PPp")}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Location:</span>
              <span>{incident.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Reporter:</span>
              <span>{incident.reporter?.full_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{incident.category}</Badge>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <h3 className="font-semibold">Description</h3>
            <p className="text-muted-foreground whitespace-pre-wrap">{incident.description}</p>
          </div>

          {/* Evidence */}
          {incident.evidence_urls && incident.evidence_urls.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Evidence</h3>
              <div className="grid grid-cols-2 gap-2">
                {incident.evidence_urls.map((url: string, index: number) => (
                  <img
                    key={index}
                    src={url}
                    alt={`Evidence ${index + 1}`}
                    className="rounded-lg border w-full h-48 object-cover"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Updates Timeline */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Updates & Comments
            </h3>
            
            <div className="space-y-2">
              <Textarea
                placeholder="Add an update or comment..."
                value={newUpdate}
                onChange={(e) => setNewUpdate(e.target.value)}
                rows={3}
              />
              <Button
                onClick={() => addUpdate.mutate()}
                disabled={!newUpdate.trim() || addUpdate.isPending}
              >
                Add Update
              </Button>
            </div>

            <div className="space-y-3 mt-4">
              {updates?.map((update) => (
                <div key={update.id} className="border rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-medium">{update.user?.full_name}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(update.created_at), "PPp")}
                    </span>
                  </div>
                  <p className="text-sm">{update.content}</p>
                  <Badge variant="outline" className="text-xs">{update.update_type}</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
