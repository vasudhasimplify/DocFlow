import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, X, RotateCcw, Download, Check, Zap, FlipHorizontal, ZoomIn, ZoomOut, ImageIcon, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export const CameraCapture = ({ onCapture, onClose }: CameraCaptureProps) => {
  const [isActive, setIsActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Check for multiple cameras on mount
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(devices => {
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      setHasMultipleCameras(videoDevices.length > 1);
    }).catch(() => {});
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      // Stop any existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 }
        }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait for video to be ready and play
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
            setIsActive(true);
          }).catch(err => {
            console.error('Failed to play video:', err);
            setCameraError("Failed to start video playback");
          });
        };
      }
    } catch (error: any) {
      console.error('Camera access denied:', error);
      let errorMessage = "Please allow camera access to capture documents";
      
      if (error.name === 'NotAllowedError') {
        errorMessage = "Camera permission denied. Please enable camera access in your browser settings.";
      } else if (error.name === 'NotFoundError') {
        errorMessage = "No camera found on this device.";
      } else if (error.name === 'NotReadableError') {
        errorMessage = "Camera is being used by another application.";
      }
      
      setCameraError(errorMessage);
      toast({
        title: "Camera Access Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Camera track stopped:', track.label);
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
  }, []);

  // Cleanup on unmount - ensures camera is released
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log('Camera track stopped on unmount:', track.label);
        });
        streamRef.current = null;
      }
    };
  }, []);

  const switchCamera = useCallback(async () => {
    const newFacingMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newFacingMode);
    
    if (isActive) {
      stopCamera();
      // Small delay before restarting with new camera
      setTimeout(() => {
        startCamera();
      }, 100);
    }
  }, [facingMode, isActive, stopCamera, startCamera]);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current) return;
    
    setIsProcessing(true);
    
    try {
      const canvas = canvasRef.current || document.createElement('canvas');
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // If using front camera, flip horizontally for mirror effect
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      
      ctx.drawImage(video, 0, 0);
      
      // Reset transform
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      
      // Convert to blob
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setIsProcessing(false);
          return;
        }
        
        const imageUrl = canvas.toDataURL('image/jpeg', 0.92);
        setCapturedImage(imageUrl);
        
        // Create file from blob with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const file = new File([blob], `scan-${timestamp}.jpg`, {
          type: 'image/jpeg'
        });
        
        setCapturedFile(file);
        setIsProcessing(false);
        stopCamera();
        
        toast({
          title: "📸 Document Captured!",
          description: "Review your scan and confirm to upload"
        });
        
      }, 'image/jpeg', 0.92);
      
    } catch (error) {
      console.error('Failed to capture photo:', error);
      toast({
        title: "Capture Failed",
        description: "Failed to capture document photo",
        variant: "destructive"
      });
      setIsProcessing(false);
    }
  }, [facingMode, stopCamera]);

  const confirmCapture = useCallback(() => {
    if (capturedFile) {
      onCapture(capturedFile);
      onClose();
    }
  }, [capturedFile, onCapture, onClose]);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    setCapturedFile(null);
    setIsProcessing(false);
    startCamera();
  }, [startCamera]);

  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  return (
    <Dialog open={true} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-4 pb-2 border-b bg-gradient-to-r from-primary/10 to-blue-500/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-xl shadow-lg">
              <Camera className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <DialogTitle className="text-lg">Document Scanner</DialogTitle>
              <p className="text-sm text-muted-foreground">
                {capturedImage ? 'Review your capture' : 'Position document in frame and capture'}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Camera View */}
        <div className="relative bg-black" style={{ aspectRatio: '4/3', maxHeight: '60vh' }}>
          <canvas ref={canvasRef} className="hidden" />
          
          {/* Video element - always rendered but hidden when not active */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${isActive && !capturedImage ? 'block' : 'hidden'}`}
            style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
          />
          
          {/* Initial state - Start Camera */}
          {!isActive && !capturedImage && !cameraError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-slate-800 to-slate-900">
              <div className="text-center p-8">
                <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6 animate-pulse">
                  <Camera className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Ready to Scan</h3>
                <p className="text-slate-400 mb-6 max-w-sm">
                  Position your document on a flat surface with good lighting for best results
                </p>
                <Button onClick={startCamera} size="lg" className="gap-2 px-8">
                  <Zap className="h-5 w-5" />
                  Start Camera
                </Button>
              </div>
            </div>
          )}

          {/* Camera Error State */}
          {cameraError && !capturedImage && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-red-900/20 to-slate-900">
              <div className="text-center p-8">
                <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="h-10 w-10 text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Camera Error</h3>
                <p className="text-slate-400 mb-6 max-w-sm">{cameraError}</p>
                <Button onClick={startCamera} variant="outline" className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Try Again
                </Button>
              </div>
            </div>
          )}
          
          {/* Live Camera Feed - Overlay elements */}
          {isActive && !capturedImage && (
            <>
              {/* Document frame overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[85%] h-[85%] relative">
                  {/* Corner markers */}
                  <div className="absolute top-0 left-0 w-12 h-12 border-l-4 border-t-4 border-primary rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-12 h-12 border-r-4 border-t-4 border-primary rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-12 h-12 border-l-4 border-b-4 border-primary rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-12 h-12 border-r-4 border-b-4 border-primary rounded-br-lg"></div>
                  
                  {/* Scanning line animation */}
                  <div className="absolute inset-x-4 top-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse"></div>
                </div>
              </div>

              {/* Camera controls overlay */}
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                {hasMultipleCameras && (
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={switchCamera}
                    className="rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm"
                    title="Switch Camera"
                  >
                    <FlipHorizontal className="h-5 w-5 text-white" />
                  </Button>
                )}
              </div>

              {/* Instruction badge */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                <Badge className="bg-black/70 text-white backdrop-blur-sm px-4 py-2 text-sm">
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Align document within the frame
                </Badge>
              </div>
            </>
          )}
          
          {/* Captured Image Preview */}
          {capturedImage && (
            <div className="relative w-full h-full">
              <img
                src={capturedImage}
                alt="Captured document"
                className="w-full h-full object-contain bg-slate-900"
              />
              <div className="absolute top-4 left-1/2 -translate-x-1/2">
                <Badge className="bg-green-500 text-white px-4 py-2">
                  <Check className="h-4 w-4 mr-2" />
                  Document Captured Successfully
                </Badge>
              </div>
            </div>
          )}

          {/* Processing overlay */}
          {isProcessing && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center backdrop-blur-sm">
              <div className="text-center text-white">
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="absolute inset-0 rounded-full border-4 border-primary/30"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                </div>
                <p className="text-lg font-medium">Processing capture...</p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-muted/50 border-t">
          {!capturedImage ? (
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={handleClose} className="gap-2">
                <X className="h-4 w-4" />
                Cancel
              </Button>
              
              <Button
                onClick={capturePhoto}
                disabled={!isActive || isProcessing}
                size="lg"
                className="gap-2 px-8 bg-primary hover:bg-primary/90"
              >
                <Camera className="h-5 w-5" />
                Capture Document
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={retakePhoto} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Retake Photo
              </Button>
              
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleClose} className="gap-2">
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
                <Button onClick={confirmCapture} size="lg" className="gap-2 px-6 bg-green-600 hover:bg-green-700">
                  <Check className="h-5 w-5" />
                  Use This Photo
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};