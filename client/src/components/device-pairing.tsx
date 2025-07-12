import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Copy, QrCode, Link2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";

interface DevicePairingProps {
  isOpen: boolean;
  onClose: () => void;
  deviceId: string;
  deviceName: string;
  onPairWithCode: (code: string) => void;
  onGenerateCode?: (code: string) => void;
  currentRoom?: string | null;
}

export function DevicePairing({ 
  isOpen, 
  onClose, 
  deviceId, 
  deviceName, 
  onPairWithCode,
  onGenerateCode,
  currentRoom 
}: DevicePairingProps) {
  const [pairingCode, setPairingCode] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [showQR, setShowQR] = useState(true);
  const { toast } = useToast();

  // Generate a 6-digit pairing code when dialog opens
  useEffect(() => {
    if (isOpen && !pairingCode) {
      // Force clear any existing QR code first
      setQrCodeUrl("");
      
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      console.log('Generating pairing code:', code);
      setPairingCode(code);
      
      // Generate QR code after a small delay to ensure state is clean
      setTimeout(() => {
        generateQRCode(code);
      }, 100);
      
      // Auto-join the room when generating the code
      // This ensures the generating device is in the room when someone scans the QR code
      if (onGenerateCode) {
        onGenerateCode(code);
      }
    }
  }, [isOpen, pairingCode, onGenerateCode]);

  async function generateQRCode(code: string) {
    try {
      // Add timestamp to prevent caching issues
      const timestamp = Date.now();
      const url = `${window.location.origin}?pair=${code}&t=${timestamp}`;
      console.log('Generated QR code URL:', url);
      console.log('This URL should make the scanning device join room: pair-' + code);
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      setQrCodeUrl(qrDataUrl);
    } catch (error) {
      console.error('QR Code generation failed:', error);
    }
  }

  function copyPairingCode() {
    navigator.clipboard.writeText(pairingCode);
    toast({
      title: "Copied to clipboard",
      description: `Pairing code: ${pairingCode}`,
      duration: 2000,
    });
  }

  function copyPairingLink() {
    const url = `${window.location.origin}?pair=${pairingCode}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copied",
      description: "Pairing link copied to clipboard",
      duration: 2000,
    });
  }

  function handlePairWithCode() {
    if (inputCode.trim().length === 6) {
      onPairWithCode(inputCode.trim());
      setInputCode("");
      onClose();
    }
  }

  function handleClose() {
    setInputCode("");
    setPairingCode("");
    setQrCodeUrl("");
    setShowQR(true);
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto mx-2 sm:mx-0 my-2 sm:my-0">
        <DialogHeader>
          <DialogTitle className="text-center text-blue-600">
            {currentRoom && currentRoom.startsWith('pair-') ? 
              `Pairing Room: ${currentRoom.replace('pair-', '')}` : 
              'Pair Devices'
            }
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Already in room message - only show if we didn't generate the code */}
          {currentRoom && currentRoom.startsWith('pair-') && !pairingCode && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-6 text-center">
                <div className="text-green-600 mb-4">
                  <div className="text-2xl font-bold mb-2">✅ Pairing Successful!</div>
                  <p className="text-sm">
                    You're now in pairing room: <span className="font-mono font-bold">{currentRoom.replace('pair-', '')}</span>
                  </p>
                  <p className="text-sm mt-2">
                    Look for other devices in the radar view. They should appear automatically.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* QR Code Section - Show if code is generated */}
          {showQR && pairingCode && (
            <Card className="border-blue-200">
              <CardContent className="p-6 text-center">
                {qrCodeUrl && (
                  <div className="mb-4">
                    <img 
                      src={qrCodeUrl} 
                      alt="QR Code" 
                      className="mx-auto rounded-lg shadow-sm"
                    />
                  </div>
                )}
                
                {/* Pairing Code Display */}
                <div className="mb-4">
                  <div className="text-3xl font-mono font-bold text-slate-800 tracking-wider mb-2">
                    {pairingCode.split('').join(' ')}
                  </div>
                  <p className="text-sm text-slate-600 mb-4">
                    📱 <strong>Share this code or scan the QR code on another device.</strong><br />
                    Room will be created: <span className="font-mono">pair-{pairingCode}</span>
                  </p>
                  
                  <div className="flex gap-2 justify-center mb-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={copyPairingCode}
                      className="flex items-center gap-2"
                    >
                      <Copy size={16} />
                      Copy Code
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={copyPairingLink}
                      className="flex items-center gap-2"
                    >
                      <Link2 size={16} />
                      Copy Link
                    </Button>
                  </div>
                  
                  <Button 
                    onClick={() => {
                      onPairWithCode(pairingCode);
                      onClose();
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    Join This Room
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Input Code Section */}
          <Card className="border-slate-200">
            <CardContent className="p-6">
              <div className="text-center mb-4">
                <p className="text-sm text-slate-600 mb-4">
                  Enter pairing code from another device to join their room.
                </p>
                
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="Enter 6-digit code"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    onKeyPress={(e) => e.key === 'Enter' && handlePairWithCode()}
                    className="text-center text-lg font-mono tracking-wider"
                    maxLength={6}
                  />
                </div>
                
                <div className="flex gap-2 justify-center">
                  <Button 
                    variant="outline" 
                    onClick={handleClose}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handlePairWithCode}
                    disabled={inputCode.length !== 6}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    Pair
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}