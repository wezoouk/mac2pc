import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Settings, Plus, Trash2, Eye, EyeOff, RefreshCw, AlertTriangle, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import type { AdPlacement, InsertAdPlacement } from "@shared/schema";

export default function AdminNew() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  // Authentication check
  useEffect(() => {
    const token = localStorage.getItem('admin-token');
    if (!token) {
      setLocation('/admin-login');
      return;
    }
  }, [setLocation]);
  
  // Helper function to get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('admin-token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };
  
  // Logout function
  const handleLogout = () => {
    localStorage.removeItem('admin-token');
    localStorage.removeItem('admin-user');
    setLocation('/admin-login');
  };
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    position: "between-content",
    adClient: "",
    adSlot: "",
    adFormat: "auto",
    isEnabled: true,
    priority: 1,
  });
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [placementToDelete, setPlacementToDelete] = useState<number | null>(null);

  // Fetch ad placements
  const { data: adPlacements = [], isLoading: loadingPlacements, refetch } = useQuery({
    queryKey: ["/api/admin/ad-placements"],
    queryFn: async () => {
      const response = await fetch("/api/admin/ad-placements", {
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('admin-token');
          localStorage.removeItem('admin-user');
          setLocation('/admin-login');
          throw new Error("Authentication required");
        }
        throw new Error("Failed to fetch ad placements");
      }
      return response.json();
    },
  });

  // Create ad placement mutation
  const createPlacementMutation = useMutation({
    mutationFn: async (placement: InsertAdPlacement) => {
      const response = await fetch("/api/admin/ad-placements", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(placement),
      });
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('admin-token');
          localStorage.removeItem('admin-user');
          setLocation('/admin-login');
          throw new Error("Authentication required");
        }
        throw new Error("Failed to create ad placement");
      }
      return response.json();
    },
    onSuccess: () => {
      refetch();
      setFormData({
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
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update ad placement mutation
  const updatePlacementMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<AdPlacement> }) => {
      const response = await fetch(`/api/admin/ad-placements/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('admin-token');
          localStorage.removeItem('admin-user');
          setLocation('/admin-login');
          throw new Error("Authentication required");
        }
        throw new Error("Failed to update ad placement");
      }
      return response.json();
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Success",
        description: "Ad placement updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete ad placement mutation
  const deletePlacementMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/ad-placements/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('admin-token');
          localStorage.removeItem('admin-user');
          setLocation('/admin-login');
          throw new Error("Authentication required");
        }
        throw new Error("Failed to delete ad placement");
      }
      return response.json();
    },
    onSuccess: () => {
      refetch();
      setDeleteDialogOpen(false);
      setPlacementToDelete(null);
      toast({
        title: "Success",
        description: "Ad placement deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreatePlacement = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.adClient || !formData.adSlot) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    createPlacementMutation.mutate(formData);
  };

  const handleTogglePlacement = (id: number, isEnabled: boolean) => {
    updatePlacementMutation.mutate({ id, updates: { isEnabled } });
  };

  const handleDeletePlacement = (id: number) => {
    setPlacementToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (placementToDelete !== null) {
      deletePlacementMutation.mutate(placementToDelete);
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
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={() => window.history.back()}>
                Back to App
              </Button>
              <Button variant="destructive" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Create New Ad Placement */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Plus size={20} />
                <span>Create New Ad Placement</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreatePlacement} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="name">Placement Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Header Banner"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="position">Position *</Label>
                    <Select 
                      value={formData.position} 
                      onValueChange={(value) => setFormData({ ...formData, position: value })}
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
                      value={formData.adFormat} 
                      onValueChange={(value) => setFormData({ ...formData, adFormat: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto</SelectItem>
                        <SelectItem value="banner">Banner</SelectItem>
                        <SelectItem value="rectangle">Rectangle</SelectItem>
                        <SelectItem value="square">Square</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="adClient">Ad Client (Publisher ID) *</Label>
                    <Input
                      id="adClient"
                      placeholder="ca-pub-1234567890123456"
                      value={formData.adClient}
                      onChange={(e) => setFormData({ ...formData, adClient: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="adSlot">Ad Slot ID *</Label>
                    <Input
                      id="adSlot"
                      placeholder="1234567890"
                      value={formData.adSlot}
                      onChange={(e) => setFormData({ ...formData, adSlot: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Input
                      id="priority"
                      type="number"
                      placeholder="1"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.isEnabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, isEnabled: checked })}
                  />
                  <Label>Enable immediately</Label>
                </div>
                <Button 
                  type="submit"
                  disabled={createPlacementMutation.isPending}
                  className="w-full md:w-auto"
                >
                  <Plus size={16} className="mr-2" />
                  {createPlacementMutation.isPending ? "Creating..." : "Create Ad Placement"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Existing Ad Placements */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Existing Ad Placements</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => refetch()}
                  disabled={loadingPlacements}
                >
                  <RefreshCw size={16} className="mr-2" />
                  {loadingPlacements ? "Loading..." : "Refresh"}
                </Button>
              </div>
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
                            disabled={updatePlacementMutation.isPending}
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
                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
                            disabled={deletePlacementMutation.isPending}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-slate-600">Client:</span>
                          <p className="font-mono text-xs">{placement.adClient}</p>
                        </div>
                        <div>
                          <span className="text-slate-600">Slot:</span>
                          <p className="font-mono text-xs">{placement.adSlot}</p>
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
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="text-red-500" size={20} />
              <span>Delete Ad Placement</span>
            </DialogTitle>
          </DialogHeader>
          <p className="text-slate-600">
            Are you sure you want to delete this ad placement? This action cannot be undone.
          </p>
          <DialogFooter className="space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={confirmDelete}
              disabled={deletePlacementMutation.isPending}
            >
              {deletePlacementMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}