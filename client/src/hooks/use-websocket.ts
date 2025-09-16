import { useState, useEffect, useRef, useCallback } from "react";

interface UseWebSocketProps {
  onMessage: (message: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function useWebSocket({ onMessage, onConnect, onDisconnect }: UseWebSocketProps) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef<number>(0);
  const maxReconnectAttempts = 10; // Increased for mobile devices
  const isConnectingRef = useRef(false);
  const visibilityChangeRef = useRef<() => void | null>(null);

  const startHeartbeat = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
    }
    
    heartbeatTimeoutRef.current = setTimeout(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
        startHeartbeat(); // Schedule next heartbeat
      }
    }, 30000); // Send ping every 30 seconds
  }, []);

  const connect = useCallback(() => {
    // Prevent multiple concurrent connection attempts
    if (isConnectingRef.current) {
      return;
    }

    // Check if we already have a working connection
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return;
    }

    // Check if we've exceeded max reconnect attempts
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      console.error('Max WebSocket reconnect attempts exceeded');
      return;
    }

    try {
      isConnectingRef.current = true;
      
      // Clear any existing timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Close existing connection if it exists
      if (wsRef.current) {
        wsRef.current.close();
      }

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.hostname}:5000/ws`;
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connection established');
        setIsConnected(true);
        reconnectAttempts.current = 0; // Reset attempts on successful connection
        isConnectingRef.current = false;
        
        // Start heartbeat to keep connection alive
        startHeartbeat();
        
        onConnect?.();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          onMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        setIsConnected(false);
        isConnectingRef.current = false;
        
        // Clear heartbeat
        if (heartbeatTimeoutRef.current) {
          clearTimeout(heartbeatTimeoutRef.current);
          heartbeatTimeoutRef.current = null;
        }
        
        onDisconnect?.();
        
        // Only attempt to reconnect if it wasn't a manual close and we haven't exceeded max attempts
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          // More aggressive reconnection for mobile devices
          const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
          const baseDelay = isMobile ? 500 : 1000;
          const delay = Math.min(baseDelay * Math.pow(1.5, reconnectAttempts.current), isMobile ? 3000 : 10000);
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current}/${maxReconnectAttempts}) - Mobile: ${isMobile}`);
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        isConnectingRef.current = false;
      };
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      isConnectingRef.current = false;
    }
  }, [onMessage, onConnect, onDisconnect]);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, message not sent:', message);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
    }
    setIsConnected(false);
    isConnectingRef.current = false;
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      connect();
    }, 1000); // Delay initial connection by 1 second to allow server to start

    // Handle mobile app backgrounding/foregrounding
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // App is backgrounded - keep connection alive but reduce activity
        console.log('App backgrounded, maintaining WebSocket connection');
      } else {
        // App is foregrounded - ensure connection is active
        console.log('App foregrounded, checking WebSocket connection');
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          console.log('Reconnecting WebSocket after app foreground');
          connect();
        }
      }
    };
    
    // Handle mobile network changes
    const handleOnline = () => {
      console.log('Network back online, reconnecting WebSocket');
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        setTimeout(() => connect(), 500); // Small delay to ensure network is stable
      }
    };
    
    const handleOffline = () => {
      console.log('Network offline detected');
    };
    
    // Add mobile-specific event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Store reference for cleanup
    visibilityChangeRef.current = handleVisibilityChange;

    return () => {
      clearTimeout(timer);
      disconnect();
      
      // Clean up mobile event listeners
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isConnected,
    sendMessage,
    disconnect
  };
}
