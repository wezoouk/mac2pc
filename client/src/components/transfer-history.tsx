import { Check, Download, Clock, Trash2, ArrowUp, ArrowDown, Flame, AlertTriangle, MessageSquare, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Transfer } from "@shared/schema";

interface TransferHistoryProps {
  transfers: Transfer[];
  currentDeviceId: string;
  onClear?: () => void;
}

export function TransferHistory({ transfers, currentDeviceId, onClear }: TransferHistoryProps) {
  function getTransferIcon(transfer: Transfer) {
    const isSent = transfer.fromDeviceId === currentDeviceId;
    
    switch (transfer.status) {
      case 'completed':
        return (
          <div className="flex items-center gap-1">
            {isSent ? 
              <ArrowUp className="text-blue-600" size={16} /> : 
              <ArrowDown className="text-green-600" size={16} />
            }
            <Check className="text-emerald-600" size={20} />
          </div>
        );
      case 'pending':
        return (
          <div className="flex items-center gap-1">
            {isSent ? 
              <ArrowUp className="text-blue-600" size={16} /> : 
              <ArrowDown className="text-green-600" size={16} />
            }
            <Clock className="text-amber-600" size={20} />
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1">
            {isSent ? 
              <ArrowUp className="text-blue-600" size={16} /> : 
              <ArrowDown className="text-green-600" size={16} />
            }
            <Download className="text-blue-600" size={20} />
          </div>
        );
    }
  }

  function getTransferStatus(transfer: Transfer) {
    switch (transfer.status) {
      case 'completed':
        return { label: 'Completed', variant: 'default' as const };
      case 'pending':
        return { label: 'In Progress', variant: 'secondary' as const };
      case 'failed':
        return { label: 'Failed', variant: 'destructive' as const };
      default:
        return { label: 'Received', variant: 'outline' as const };
    }
  }

  function formatTimeAgo(date: Date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hour ago`;
    return `${Math.floor(diffInSeconds / 86400)} day ago`;
  }

  function getTimeRemaining(expiresAt: Date | null) {
    if (!expiresAt) return null;
    
    const now = new Date();
    const remaining = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);
    
    if (remaining <= 0) return 'Expired';
    if (remaining < 60) return `${remaining}s left`;
    if (remaining < 3600) return `${Math.floor(remaining / 60)}m left`;
    if (remaining < 86400) return `${Math.floor(remaining / 3600)}h left`;
    return `${Math.floor(remaining / 86400)}d left`;
  }

  function isExpired(transfer: Transfer) {
    if (!transfer.expiresAt) return false;
    return new Date() >= new Date(transfer.expiresAt);
  }

  if (transfers.length === 0) {
    return (
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Recent Activity</CardTitle>
          <p className="text-sm text-slate-600">Transfer history (not stored on server)</p>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-slate-500">
            <Clock className="mx-auto mb-3" size={32} />
            <p>No recent activity</p>
            <p className="text-sm">Your transfers will appear here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-8">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-xl font-semibold">Recent Activity</CardTitle>
          <p className="text-sm text-slate-600">Transfer history (not stored on server)</p>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-slate-600 hover:text-red-600"
          onClick={onClear}
        >
          <Trash2 size={16} />
        </Button>
      </CardHeader>
      
      <CardContent className="divide-y divide-slate-200">
        {transfers.map((transfer) => (
          <div key={transfer.id} className="py-6 hover:bg-slate-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  {getTransferIcon(transfer)}
                </div>
                <div>
                  <h4 className="font-medium text-slate-900 flex items-center gap-2">
                    <Badge variant={transfer.fromDeviceId === currentDeviceId ? "default" : "secondary"} className="text-xs">
                      {transfer.fromDeviceId === currentDeviceId ? "Sent" : "Received"}
                    </Badge>
                    {transfer.fileName ? `File: ${transfer.fileName}` : 'Message'}
                    {transfer.selfDestructTimer && (
                      <div className="flex items-center text-red-600">
                        <Flame size={12} className="mr-1" />
                        <span className="text-xs">Self-destruct</span>
                      </div>
                    )}
                  </h4>
                  <p className="text-sm text-slate-600">
                    {transfer.messageText || 
                     `${transfer.fileName} • ${transfer.fileSize ? Math.round(transfer.fileSize / 1024) : 0} KB`}
                  </p>
                  {transfer.expiresAt && (
                    <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                      <Clock size={10} />
                      {isExpired(transfer) ? 'Expired' : getTimeRemaining(transfer.expiresAt)}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <Badge variant={getTransferStatus(transfer).variant}>
                  {getTransferStatus(transfer).label}
                </Badge>
                <p className="text-xs text-slate-500 mt-1">
                  {formatTimeAgo(transfer.createdAt || new Date())}
                </p>
              </div>
            </div>
            
            {transfer.status === 'pending' && transfer.progress !== undefined && (
              <div className="mt-3 bg-slate-200 rounded-full h-2">
                <div 
                  className="bg-amber-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${transfer.progress}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
