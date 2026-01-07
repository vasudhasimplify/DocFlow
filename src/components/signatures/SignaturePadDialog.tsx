import React, { useRef, useState, useEffect } from 'react';
import { PenTool, Type, Upload, Trash2, Check, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useElectronicSignatures } from '@/hooks/useElectronicSignatures';
import { SIGNATURE_FONTS } from '@/types/signature';
import { cn } from '@/lib/utils';

interface SignaturePadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSignatureSelect?: (dataUrl: string) => void;
  type?: 'signature' | 'initial';
}

export const SignaturePadDialog: React.FC<SignaturePadDialogProps> = ({
  open,
  onOpenChange,
  onSignatureSelect,
  type = 'signature',
}) => {
  const { userSignatures, saveUserSignature, deleteUserSignature } = useElectronicSignatures();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'draw' | 'type' | 'upload' | 'saved'>('draw');
  const [isDrawing, setIsDrawing] = useState(false);
  const [typedName, setTypedName] = useState('');
  const [selectedFont, setSelectedFont] = useState(SIGNATURE_FONTS[0].value);
  const [signatureName, setSignatureName] = useState('');
  const [hasDrawing, setHasDrawing] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const filteredSignatures = userSignatures.filter(s => s.signature_type === type);

  useEffect(() => {
    if (open && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [open, activeTab]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawing(true);

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawing(false);
  };

  const getCanvasDataUrl = () => {
    const canvas = canvasRef.current;
    return canvas?.toDataURL('image/png') || '';
  };

  const getTypedSignatureDataUrl = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#1a1a1a';
    ctx.font = `48px ${selectedFont}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(typedName, canvas.width / 2, canvas.height / 2);

    return canvas.toDataURL('image/png');
  };

  const handleSave = async () => {
    let dataUrl = '';

    if (activeTab === 'draw') {
      dataUrl = getCanvasDataUrl();
    } else if (activeTab === 'type') {
      dataUrl = getTypedSignatureDataUrl();
    } else if (activeTab === 'upload' && uploadedImage) {
      dataUrl = uploadedImage;
    }

    if (!dataUrl) return;

    await saveUserSignature({
      signature_type: type,
      name: signatureName || (type === 'signature' ? 'My Signature' : 'My Initials'),
      data_url: dataUrl,
      font_family: activeTab === 'type' ? selectedFont : undefined,
      is_default: filteredSignatures.length === 0,
    });

    if (onSignatureSelect) {
      onSignatureSelect(dataUrl);
      onOpenChange(false);
    }
  };

  const handleSelectSaved = (signature: typeof userSignatures[0]) => {
    if (onSignatureSelect) {
      onSignatureSelect(signature.data_url);
      onOpenChange(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 2MB",
        variant: "destructive"
      });
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (PNG, JPG, or SVG)",
        variant: "destructive"
      });
      return;
    }

    // Read file as data URL
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;

      // AI Verification
      setIsVerifying(true);
      try {
        const response = await fetch('/api/v1/verify-signature-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_data_url: dataUrl })
        });

        if (!response.ok) {
          throw new Error('Verification failed');
        }

        const result = await response.json();

        if (!result.is_valid_signature) {
          toast({
            title: "Not a signature",
            description: "Please upload a signature on white paper with blue or black pen. Colorful or complex images are not allowed.",
            variant: "destructive"
          });
          return;
        }

        // Success - set uploaded image
        setUploadedImage(dataUrl);
        toast({
          title: "Verified by AI",
          description: "Signature looks good!"
        });
      } catch (error) {
        console.error('Verification failed:', error);
        toast({
          title: "Verification failed",
          description: "Could not verify image. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsVerifying(false);
      }
    };

    reader.readAsDataURL(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenTool className="h-5 w-5" />
            {onSignatureSelect
              ? `Select ${type === 'signature' ? 'Signature' : 'Initials'}`
              : 'Manage My Signatures'}
          </DialogTitle>
          <DialogDescription>
            {onSignatureSelect
              ? 'Draw, type, or choose a saved signature'
              : 'Create and manage your saved signatures'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="draw" className="gap-1">
              <PenTool className="h-4 w-4" />
              Draw
            </TabsTrigger>
            <TabsTrigger value="type" className="gap-1">
              <Type className="h-4 w-4" />
              Type
            </TabsTrigger>
            <TabsTrigger value="upload" className="gap-1">
              <Upload className="h-4 w-4" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="saved" className="gap-1">
              Saved
              {filteredSignatures.length > 0 && (
                <Badge variant="secondary" className="ml-1">{filteredSignatures.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="draw" className="space-y-4">
            <div className="border rounded-lg overflow-hidden bg-white">
              <canvas
                ref={canvasRef}
                width={500}
                height={150}
                className="w-full cursor-crosshair touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={clearCanvas}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Clear
              </Button>
              <p className="text-xs text-muted-foreground">
                Draw your {type} above
              </p>
            </div>
          </TabsContent>

          <TabsContent value="type" className="space-y-4">
            <div>
              <Label>Type your {type === 'signature' ? 'name' : 'initials'}</Label>
              <Input
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder={type === 'signature' ? 'John Smith' : 'JS'}
                className="text-lg"
              />
            </div>

            <div>
              <Label>Choose a style</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {SIGNATURE_FONTS.map((font) => (
                  <Card
                    key={font.value}
                    className={cn(
                      "cursor-pointer transition-colors",
                      selectedFont === font.value && "border-primary"
                    )}
                    onClick={() => setSelectedFont(font.value)}
                  >
                    <CardContent className="p-4 text-center">
                      <span
                        style={{ fontFamily: font.value }}
                        className="text-2xl"
                      >
                        {typedName || 'Your Name'}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">{font.name}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/svg+xml"
              className="hidden"
              onChange={handleFileUpload}
            />

            {uploadedImage ? (
              <div className="space-y-4">
                <div className="border rounded-lg p-4 bg-white">
                  <img
                    src={uploadedImage}
                    alt="Uploaded signature"
                    className="max-h-32 mx-auto object-contain"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUploadedImage(null)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Verified by AI
                  </p>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">
                  {isVerifying ? "Verifying signature with AI..." : "Upload an image of your signature"}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isVerifying}
                >
                  {isVerifying ? "Verifying..." : "Choose File"}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  PNG, JPG, or SVG up to 2MB. AI will verify it's a real signature.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="saved">
            <ScrollArea className="h-[250px]">
              {filteredSignatures.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <PenTool className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No saved {type === 'signature' ? 'signatures' : 'initials'}</p>
                  <p className="text-xs mt-1">Draw or type to create one</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredSignatures.map((sig) => (
                    <Card
                      key={sig.id}
                      className={cn(
                        "cursor-pointer hover:border-primary transition-colors",
                        sig.is_default && "border-primary"
                      )}
                      onClick={() => handleSelectSaved(sig)}
                    >
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="flex-1 bg-white rounded p-2 border">
                          <img
                            src={sig.data_url}
                            alt={sig.name}
                            className="h-10 object-contain mx-auto"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{sig.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Created {new Date(sig.created_at).toLocaleDateString()}
                          </p>
                          {sig.is_default && (
                            <Badge variant="secondary" className="text-xs mt-1">Default</Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteUserSignature(sig.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {(activeTab === 'draw' || activeTab === 'type' || activeTab === 'upload') && (
          <div>
            <Label>Save as (optional)</Label>
            <Input
              placeholder={type === 'signature' ? 'My Signature' : 'My Initials'}
              value={signatureName}
              onChange={(e) => setSignatureName(e.target.value)}
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {(activeTab === 'draw' || activeTab === 'type' || (activeTab === 'upload' && uploadedImage)) && (
            <Button
              onClick={handleSave}
              disabled={
                activeTab === 'draw' ? !hasDrawing :
                  activeTab === 'type' ? !typedName.trim() :
                    activeTab === 'upload' ? !uploadedImage :
                      false
              }
            >
              <Check className="h-4 w-4 mr-2" />
              {onSignatureSelect ? 'Use This Signature' : 'Save Signature'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
