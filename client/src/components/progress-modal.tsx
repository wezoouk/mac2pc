import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface ProgressModalProps {
  transfer: any;
  onCancel: () => void;
}

export function ProgressModal({ transfer, onCancel }: ProgressModalProps) {
  if (!transfer) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="max-w-md w-full mx-4">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Transfer in Progress</h3>
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X size={16} />
            </Button>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">
                {transfer.type === 'send' ? 'Sending to' : 'Receiving from'} {transfer.deviceName}
              </span>
              <span className="text-sm font-medium text-slate-900">
                {transfer.progress || 0}%
              </span>
            </div>
            
            <Progress value={transfer.progress || 0} className="h-3" />
            
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>
                {transfer.fileName} ({Math.round((transfer.fileSize || 0) / 1024)} KB)
              </span>
              <span>{transfer.speed || '0 KB/s'}</span>
            </div>
            
            <div className="text-xs text-slate-500 text-center">
              Estimated time remaining: {transfer.timeRemaining || 'calculating...'}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
