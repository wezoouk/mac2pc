import { FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface TransferModalProps {
  transfer: any;
  onAccept: () => void;
  onDecline: () => void;
  onAcceptAll?: () => void;
  queueCount?: number;
}

export function TransferModal({ transfer, onAccept, onDecline, onAcceptAll, queueCount = 0 }: TransferModalProps) {
  if (!transfer) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="max-w-md w-full mx-4">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="text-blue-600" size={20} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {transfer.type === 'file' ? 'Incoming File' : 'Incoming Message'}
                </h3>
                <p className="text-sm text-slate-600">From: {transfer.fromName || transfer.from}</p>
                {queueCount > 0 && (
                  <p className="text-xs text-amber-600 font-medium">
                    {queueCount + 1} files in queue
                  </p>
                )}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onDecline}>
              <X size={16} />
            </Button>
          </div>
          
          <div className="bg-slate-50 rounded-lg p-4 mb-6">
            {transfer.type === 'file' ? (
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-slate-900">{transfer.fileName}</h4>
                  <p className="text-sm text-slate-600">
                    Size: {transfer.fileSize < 1024 ? `${transfer.fileSize} B` : 
                           transfer.fileSize < 1024 * 1024 ? `${Math.round(transfer.fileSize / 1024)} KB` :
                           `${(transfer.fileSize / (1024 * 1024)).toFixed(2)} MB`}
                  </p>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="text-blue-600" size={16} />
                </div>
              </div>
            ) : (
              <div>
                <h4 className="font-medium text-slate-900">Message</h4>
                <p className="text-sm text-slate-600 mt-1">{transfer.messageText}</p>
              </div>
            )}
          </div>

          <div className="flex space-x-3">
            <Button 
              onClick={onDecline}
              variant="secondary"
              className="flex-1"
            >
              Decline
            </Button>
            <Button 
              onClick={onAccept}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {transfer.type === 'file' ? 'Download' : 'Accept'}
            </Button>
          </div>
          
          {queueCount > 0 && onAcceptAll && transfer.type === 'file' && (
            <div className="mt-3 pt-3 border-t border-slate-200">
              <Button 
                onClick={onAcceptAll}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                Download All ({queueCount + 1} files)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
