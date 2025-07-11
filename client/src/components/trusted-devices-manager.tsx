import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Shield, Plus, Trash2, ShieldCheck, ShieldX, Clock, FileText, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface TrustedDevice {
  id: number;
  deviceId: string;
  trustedDeviceId: string;
  deviceName: string;
  trustedDeviceName: string;
  autoAcceptFiles: boolean;
  autoAcceptMessages: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface TrustedDevicesManagerProps {
  currentDeviceId: string;
  currentDeviceName: string;
}

export function TrustedDevicesManager({ currentDeviceId, currentDeviceName }: TrustedDevicesManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    trustedDeviceId: '',
    trustedDeviceName: '',
    autoAcceptFiles: true,
    autoAcceptMessages: true,
  });

  // Fetch trusted devices
  const { data: trustedDevices = [], isLoading } = useQuery<TrustedDevice[]>({
    queryKey: [`/api/trusted-devices/${currentDeviceId}`],
    queryFn: async () => {
      const response = await fetch(`/api/trusted-devices/${currentDeviceId}`);
      if (!response.ok) throw new Error('Failed to fetch trusted devices');
      return response.json();
    },
  });

  // Create trusted device mutation
  const createTrustedMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch('/api/trusted-devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: currentDeviceId,
          trustedDeviceId: data.trustedDeviceId,
          deviceName: currentDeviceName,
          trustedDeviceName: data.trustedDeviceName,
          autoAcceptFiles: data.autoAcceptFiles,
          autoAcceptMessages: data.autoAcceptMessages,
        }),
      });
      if (!response.ok) throw new Error('Failed to add trusted device');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trusted-devices/${currentDeviceId}`] });
      setIsDialogOpen(false);
      setFormData({
        trustedDeviceId: '',
        trustedDeviceName: '',
        autoAcceptFiles: true,
        autoAcceptMessages: true,
      });
      toast({
        title: 'Success',
        description: 'Trusted device added successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update trusted device mutation
  const updateTrustedMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<TrustedDevice> }) => {
      const response = await fetch(`/api/trusted-devices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update trusted device');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trusted-devices/${currentDeviceId}`] });
      toast({
        title: 'Success',
        description: 'Trusted device updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete trusted device mutation
  const deleteTrustedMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/trusted-devices/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to remove trusted device');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trusted-devices/${currentDeviceId}`] });
      toast({
        title: 'Success',
        description: 'Trusted device removed successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.trustedDeviceId || !formData.trustedDeviceName) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }
    createTrustedMutation.mutate(formData);
  };

  const handleToggleAutoAccept = (device: TrustedDevice, field: 'autoAcceptFiles' | 'autoAcceptMessages') => {
    updateTrustedMutation.mutate({
      id: device.id,
      updates: { [field]: !device[field] }
    });
  };

  const handleRemove = (id: number) => {
    deleteTrustedMutation.mutate(id);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Trusted Devices
          <Badge variant="secondary" className="ml-auto">
            {trustedDevices.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                Add devices you trust to automatically accept files and messages without prompting.
              </p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Device
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Trusted Device</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="trustedDeviceId">Device ID *</Label>
                    <Input
                      id="trustedDeviceId"
                      value={formData.trustedDeviceId}
                      onChange={(e) => setFormData({ ...formData, trustedDeviceId: e.target.value })}
                      placeholder="Enter device ID"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="trustedDeviceName">Device Name *</Label>
                    <Input
                      id="trustedDeviceName"
                      value={formData.trustedDeviceName}
                      onChange={(e) => setFormData({ ...formData, trustedDeviceName: e.target.value })}
                      placeholder="Enter device name"
                      required
                    />
                  </div>
                  <div className="space-y-3">
                    <Label>Auto-accept Settings</Label>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm">Auto-accept files</span>
                      </div>
                      <Switch
                        checked={formData.autoAcceptFiles}
                        onCheckedChange={(checked) => setFormData({ ...formData, autoAcceptFiles: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        <span className="text-sm">Auto-accept messages</span>
                      </div>
                      <Switch
                        checked={formData.autoAcceptMessages}
                        onCheckedChange={(checked) => setFormData({ ...formData, autoAcceptMessages: checked })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createTrustedMutation.isPending}>
                      {createTrustedMutation.isPending ? 'Adding...' : 'Add Device'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Loading trusted devices...</p>
            </div>
          ) : trustedDevices.length === 0 ? (
            <div className="text-center py-8">
              <ShieldX className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-500">No trusted devices added yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {trustedDevices.map((device) => (
                <div key={device.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">{device.trustedDeviceName}</p>
                      <p className="text-xs text-gray-500">
                        ID: {device.trustedDeviceId}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Added {formatDistanceToNow(new Date(device.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Button
                        variant={device.autoAcceptFiles ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleToggleAutoAccept(device, 'autoAcceptFiles')}
                        disabled={updateTrustedMutation.isPending}
                      >
                        <FileText className="h-3 w-3" />
                      </Button>
                      <Button
                        variant={device.autoAcceptMessages ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleToggleAutoAccept(device, 'autoAcceptMessages')}
                        disabled={updateTrustedMutation.isPending}
                      >
                        <MessageSquare className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemove(device.id)}
                      disabled={deleteTrustedMutation.isPending}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}