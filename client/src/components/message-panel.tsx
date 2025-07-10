import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { Device } from "@shared/schema";

interface MessagePanelProps {
  selectedDevice: Device | null;
  onMessageSend: (message: string) => void;
}

export function MessagePanel({ selectedDevice, onMessageSend }: MessagePanelProps) {
  const [message, setMessage] = useState("");

  function handleSendMessage() {
    if (!message.trim() || !selectedDevice) return;
    
    onMessageSend(message);
    setMessage("");
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
