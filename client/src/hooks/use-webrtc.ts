import { useState, useRef, useCallback } from "react";

interface UseWebRTCProps {
  onFileReceived: (file: File, from: string) => void;
  onMessageReceived: (message: string, from: string) => void;
  onTransferProgress: (progress: any) => void;
  onTransferRequest: (request: any) => void;
  onSignalingMessage: (message: any) => void;
}

export function useWebRTC({
  onFileReceived,
  onMessageReceived,
  onTransferProgress,
  onTransferRequest,
  onSignalingMessage
}: UseWebRTCProps) {
  const [isConnected, setIsConnected] = useState(false);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const fileTransferRef = useRef<any>(null);

  const createPeerConnection = useCallback(() => {
    const config: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    const pc = new RTCPeerConnection(config);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        onSignalingMessage({
          type: 'ice-candidate',
          data: event.candidate
        });
      }
    };

    pc.onconnectionstatechange = () => {
      setIsConnected(pc.connectionState === 'connected');
    };

    pc.ondatachannel = (event) => {
      const channel = event.channel;
      setupDataChannel(channel);
    };

    return pc;
  }, [onSignalingMessage]);

  const setupDataChannel = useCallback((channel: RTCDataChannel) => {
    channel.onopen = () => {
      console.log('Data channel opened');
    };

    channel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'file-chunk') {
          handleFileChunk(data);
        } else if (data.type === 'file-start') {
          handleFileStart(data);
        } else if (data.type === 'file-end') {
          handleFileEnd(data);
        } else if (data.type === 'message') {
          onMessageReceived(data.content, data.from);
        }
      } catch (error) {
        // Assume it's a direct message if JSON parsing fails
        onMessageReceived(event.data, 'unknown');
      }
    };

    dataChannelRef.current = channel;
  }, [onMessageReceived]);

  const handleFileChunk = useCallback((data: any) => {
    if (!fileTransferRef.current) return;

    fileTransferRef.current.chunks.push(data.chunk);
    fileTransferRef.current.received += data.chunk.length;
    
    const progress = (fileTransferRef.current.received / fileTransferRef.current.total) * 100;
    onTransferProgress({ progress, ...fileTransferRef.current });
    
    if (fileTransferRef.current.received >= fileTransferRef.current.total) {
      // File transfer complete
      const blob = new Blob(fileTransferRef.current.chunks, { 
        type: fileTransferRef.current.mimeType 
      });
      const file = new File([blob], fileTransferRef.current.fileName, {
        type: fileTransferRef.current.mimeType
      });
      
      onFileReceived(file, fileTransferRef.current.from);
      fileTransferRef.current = null;
    }
  }, [onTransferProgress, onFileReceived]);

  const handleFileStart = useCallback((data: any) => {
    fileTransferRef.current = {
      fileName: data.fileName,
      mimeType: data.mimeType,
      total: data.size,
      received: 0,
      chunks: [],
      from: data.from
    };
  }, []);

  const handleFileEnd = useCallback((data: any) => {
    // File transfer completed
    fileTransferRef.current = null;
  }, []);

  const createOffer = useCallback(async (targetDeviceId: string) => {
    const pc = createPeerConnection();
    peerConnectionRef.current = pc;

    // Create data channel
    const channel = pc.createDataChannel('fileTransfer');
    setupDataChannel(channel);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    onSignalingMessage({
      type: 'offer',
      to: targetDeviceId,
      data: offer
    });

    return offer;
  }, [createPeerConnection, setupDataChannel, onSignalingMessage]);

  const createAnswer = useCallback(async (offer: RTCSessionDescriptionInit, fromDeviceId: string) => {
    const pc = createPeerConnection();
    peerConnectionRef.current = pc;

    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    onSignalingMessage({
      type: 'answer',
      to: fromDeviceId,
      data: answer
    });

    return answer;
  }, [createPeerConnection, onSignalingMessage]);

  const handleOffer = useCallback(async (offer: RTCSessionDescriptionInit, fromDeviceId: string) => {
    return await createAnswer(offer, fromDeviceId);
  }, [createAnswer]);

  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit, fromDeviceId: string) => {
    if (peerConnectionRef.current) {
      await peerConnectionRef.current.setRemoteDescription(answer);
    }
  }, []);

  const handleIceCandidate = useCallback(async (candidate: RTCIceCandidateInit, fromDeviceId: string) => {
    if (peerConnectionRef.current) {
      await peerConnectionRef.current.addIceCandidate(candidate);
    }
  }, []);

  const sendFile = useCallback(async (file: File, targetDeviceId: string) => {
    if (!dataChannelRef.current || dataChannelRef.current.readyState !== 'open') {
      console.error('Data channel not ready');
      return;
    }

    const chunkSize = 16384; // 16KB chunks
    const reader = new FileReader();
    let offset = 0;

    // Send file metadata first
    dataChannelRef.current.send(JSON.stringify({
      type: 'file-start',
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
      from: targetDeviceId
    }));

    const sendChunk = () => {
      const chunk = file.slice(offset, offset + chunkSize);
      reader.readAsArrayBuffer(chunk);
    };

    reader.onload = (e) => {
      if (e.target?.result) {
        dataChannelRef.current?.send(JSON.stringify({
          type: 'file-chunk',
          chunk: Array.from(new Uint8Array(e.target.result as ArrayBuffer))
        }));

        offset += chunkSize;
        
        const progress = (offset / file.size) * 100;
        onTransferProgress({ progress, fileName: file.name, fileSize: file.size });

        if (offset < file.size) {
          sendChunk();
        } else {
          // File transfer complete
          dataChannelRef.current?.send(JSON.stringify({
            type: 'file-end',
            fileName: file.name
          }));
        }
      }
    };

    sendChunk();
  }, [onTransferProgress]);

  const sendMessage = useCallback((message: string, targetDeviceId: string) => {
    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      dataChannelRef.current.send(JSON.stringify({
        type: 'message',
        content: message,
        from: targetDeviceId
      }));
    }
  }, []);

  return {
    isConnected,
    createOffer,
    createAnswer,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    sendFile,
    sendMessage
  };
}
