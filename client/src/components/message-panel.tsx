import { useState } from "react";
import { Send, Clock, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Device } from "@shared/schema";

interface MessagePanelProps {
  selectedDevice: Device | null;
  onMessageSend: (message: string, selfDestructTimer?: number) => void;
}

export function MessagePanel({ selectedDevice, onMessageSend }: MessagePanelProps) {
  const [message, setMessage] = useState("");
  const [selfDestructTimer, setSelfDestructTimer] = useState<string>("");

  function handleSendMessage() {
    if (!message.trim() || !selectedDevice) return;
    
    const timer = selfDestructTimer && selfDestructTimer !== "never" ? parseInt(selfDestructTimer) : undefined;
    onMessageSend(message, timer);
    setMessage("");
    setSelfDestructTimer("");
  }

  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Quick Message</CardTitle>
        <p className="text-sm text-slate-600">Send text or links instantly</p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Textarea
          placeholder="Type your message or paste a link..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          className="resize-none"
          rows={3}
        />
        
        {/* Self-Destruct Timer */}
        <div className="flex items-center space-x-2">
          <Clock size={16} className="text-slate-500" />
          <span className="text-sm text-slate-600">Self-destruct:</span>
          <Select value={selfDestructTimer} onValueChange={setSelfDestructTimer}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Never" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="never">Never</SelectItem>
              <SelectItem value="30">30 seconds</SelectItem>
              <SelectItem value="300">5 minutes</SelectItem>
              <SelectItem value="1800">30 minutes</SelectItem>
              <SelectItem value="3600">1 hour</SelectItem>
              <SelectItem value="86400">24 hours</SelectItem>
            </SelectContent>
          </Select>
          {selfDestructTimer && selfDestructTimer !== "never" && (
            <div className="flex items-center text-red-600">
              <Flame size={14} className="mr-1" />
              <span className="text-xs">Self-destruct enabled</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">
            {message.length}/500 characters
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() || !selectedDevice}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Send size={16} className="mr-2" />
            Send Message
          </Button>
        </div>

        {!selectedDevice && (
          <p className="text-sm text-amber-600 text-center">
            Select a device to send messages
          </p>
        )}
      </CardContent>
    </Card>
  );
}
