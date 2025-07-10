import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Plus, Trash2, Eye, EyeOff, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { AdPlacement, InsertAdPlacement } from "@shared/schema";

export default function Admin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newPlacement, setNewPlacement] = useState<Partial<InsertAdPlacement>>({
    name: "",
    position: "between-content",
    adClient: "",
    adSlot: "",
    adFormat: "auto",
    isEnabled: true,
    priority: 1,
  });

  // Fetch ad placements
  const { data: adPlacements = [], isLoading: loadingPlacements } = useQuery({
    queryKey: ["/api/admin/ad-placements"],
  });

  // Create ad placement mutation
  const createPlacementMutation = useMutation({
    mutationFn: async (placement: InsertAdPlacement) => {
      return await apiRequest("/api/admin/ad-placements", {
        method: "POST",
        body: JSON.stringify(placement),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ad-placements"] });
      setNewPlacement({
        name: "",
        position: "between-content",
        adClient: "",
        adSlot: "",
        adFormat: "auto",
        isEnabled: true,
        priority: 1,
      });
      toast({
        title: "Success",
        description: "Ad placement created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create ad placement",
        variant: "destructive",
      });
    },
  });

  // Update ad placement mutation
  const updatePlacementMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<AdPlacement> }) => {
      return await apiRequest(`/api/admin/ad-placements/${id}`, {
        method: "PUT",
        body: JSON.stringify(updates),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ad-placements"] });
      toast({
        title: "Success",
        description: "Ad placement updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update ad placement",
        variant: "destructive",
      });
    },
  });

  // Delete ad placement mutation
  const deletePlacementMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/admin/ad-placements/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ad-placements"] });
      toast({
        title: "Success",
        description: "Ad placement deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete ad placement",
        variant: "destructive",
      });
    },
  });

  const handleCreatePlacement = () => {
    if (!newPlacement.name || !newPlacement.adClient || !newPlacement.adSlot) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    createPlacementMutation.mutate(newPlacement as InsertAdPlacement);
  };

  const handleTogglePlacement = (id: number, isEnabled: boolean) => {
    updatePlacementMutation.mutate({ id, updates: { isEnabled } });
  };

  const handleUpdatePlacement = (id: number, field: string, value: any) => {
    updatePlacementMutation.mutate({ id, updates: { [field]: value } });
  };

  const handleDeletePlacement = (id: number) => {
    if (confirm("Are you sure you want to delete this ad placement?")) {
      deletePlacementMutation.mutate(id);
    }
  };

  const getPositionBadgeColor = (position: string) => {
    switch (position) {
      case "header": return "bg-blue-100 text-blue-800";
      case "sidebar": return "bg-green-100 text-green-800";
      case "footer": return "bg-purple-100 text-purple-800";
      case "between-content": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                <Settings className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">Admin Settings</h1>
                <p className="text-xs text-slate-500">Manage Google Ads & Configuration</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => window.history.back()}>
              Back to App
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="ads" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ads">Google Ads</TabsTrigger>
            <TabsTrigger value="settings">General Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="ads" className="space-y-6">
            {/* Create New Ad Placement */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Plus size={20} />
                  <span>Create New Ad Placement</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="name">Placement Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Header Banner"
                      value={newPlacement.name}
                      onChange={(e) => setNewPlacement({ ...newPlacement, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="position">Position</Label>
                    <Select 
                      value={newPlacement.position} 
                      onValueChange={(value) => setNewPlacement({ ...newPlacement, position: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="header">Header</SelectItem>
                        <SelectItem value="sidebar">Sidebar</SelectItem>
                        <SelectItem value="between-content">Between Content</SelectItem>
                        <SelectItem value="footer">Footer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="adFormat">Ad Format</Label>
                    <Select 
                      value={newPlacement.adFormat} 
                      onValueChange={(value) => setNewPlacement({ ...newPlacement, adFormat: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto</SelectItem>
                        <SelectItem value="banner">Banner</SelectItem>
                        <SelectItem value="rectangle">Rectangle</SelectItem>
                        <SelectItem value="square">Square</SelectItem>
                        <SelectItem value="leaderboard">Leaderboard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="adClient">Ad Client (Publisher ID)</Label>
                    <Input
                      id="adClient"
                      placeholder="ca-pub-xxxxxxxxxxxxxxxxx"
                      value={newPlacement.adClient}
                      onChange={(e) => setNewPlacement({ ...newPlacement, adClient: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="adSlot">Ad Slot ID</Label>
                    <Input
                      id="adSlot"
                      placeholder="1234567890"
                      value={newPlacement.adSlot}
                      onChange={(e) => setNewPlacement({ ...newPlacement, adSlot: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Input
                      id="priority"
                      type="number"
                      placeholder="1"
                      value={newPlacement.priority}
                      onChange={(e) => setNewPlacement({ ...newPlacement, priority: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={newPlacement.isEnabled}
                    onCheckedChange={(checked) => setNewPlacement({ ...newPlacement, isEnabled: checked })}
                  />
                  <Label>Enable immediately</Label>
                </div>
                <Button 
                  onClick={handleCreatePlacement}
                  disabled={createPlacementMutation.isPending}
                  className="w-full md:w-auto"
                >
                  <Plus size={16} className="mr-2" />
                  Create Ad Placement
                </Button>
              </CardContent>
            </Card>

            {/* Existing Ad Placements */}
            <Card>
              <CardHeader>
                <CardTitle>Existing Ad Placements</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingPlacements ? (
                  <div className="text-center py-8">Loading...</div>
                ) : adPlacements.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">No ad placements found</div>
                ) : (
                  <div className="space-y-4">
                    {adPlacements.map((placement: AdPlacement) => (
                      <div key={placement.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <h3 className="font-medium text-slate-900">{placement.name}</h3>
                            <Badge className={getPositionBadgeColor(placement.position)}>
                              {placement.position}
                            </Badge>
                            <Badge variant={placement.isEnabled ? "default" : "secondary"}>
                              {placement.isEnabled ? "Enabled" : "Disabled"}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleTogglePlacement(placement.id, !placement.isEnabled)}
                            >
                              {placement.isEnabled ? (
                                <EyeOff size={16} className="text-red-500" />
                              ) : (
                                <Eye size={16} className="text-green-500" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePlacement(placement.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                          <div>
                            <span className="text-slate-600">Client:</span>
                            <p className="font-mono">{placement.adClient}</p>
                          </div>
                          <div>
                            <span className="text-slate-600">Slot:</span>
                            <p className="font-mono">{placement.adSlot}</p>
                          </div>
                          <div>
                            <span className="text-slate-600">Format:</span>
                            <p>{placement.adFormat}</p>
                          </div>
                          <div>
                            <span className="text-slate-600">Priority:</span>
                            <p>{placement.priority}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-slate-500">
                  General settings coming soon...
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}