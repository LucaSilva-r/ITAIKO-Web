import { useState, useRef, useEffect } from "react";
import { useDevice } from "@/context/DeviceContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HelpButton } from "@/components/ui/help-modal";
import { AlertCircle, Check, Trash2, Upload } from "lucide-react";

export function BootScreenEditor() {
  const { isConnected, uploadBootScreen, clearBootScreen } = useDevice();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Constants for BMP format
  const WIDTH = 128;
  const HEIGHT = 64;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setStatus("idle");
      setStatusMessage("");
    }
  };

  const processImage = async (): Promise<Uint8Array | null> => {
    if (!selectedFile || !canvasRef.current) return null;

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d")!;
        
        // 1. Draw resized image to canvas
        // We use white background for transparency
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        
        // Calculate scaling to fit
        const scale = Math.min(WIDTH / img.width, HEIGHT / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (WIDTH - w) / 2;
        const y = (HEIGHT - h) / 2;
        
        ctx.drawImage(img, x, y, w, h);

        // 2. Get pixel data and convert to 1-bit monochrome
        const imageData = ctx.getImageData(0, 0, WIDTH, HEIGHT);
        const data = imageData.data;
        
        // Buffer for BMP data (header + pixel array)
        // Row size must be multiple of 4 bytes. 128 pixels / 8 bits = 16 bytes. 16 is multiple of 4.
        const rowSize = 16; 
        const pixelArraySize = rowSize * HEIGHT;
        const fileHeaderSize = 14;
        const infoHeaderSize = 40;
        const colorTableSize = 8; // 2 colors * 4 bytes
        const fileSize = fileHeaderSize + infoHeaderSize + colorTableSize + pixelArraySize;
        
        const buffer = new ArrayBuffer(fileSize);
        const view = new DataView(buffer);
        
        // --- Bitmap File Header ---
        view.setUint16(0, 0x4D42, true); // "BM"
        view.setUint32(2, fileSize, true); // File size
        view.setUint16(6, 0, true); // Reserved
        view.setUint16(8, 0, true); // Reserved
        view.setUint32(10, fileHeaderSize + infoHeaderSize + colorTableSize, true); // Offset to pixel data
        
        // --- Bitmap Info Header (BITMAPINFOHEADER) ---
        view.setUint32(14, infoHeaderSize, true); // Header size
        view.setInt32(18, WIDTH, true); // Width
        view.setInt32(22, HEIGHT, true); // Height (positive = bottom-up, we'll handle flipping)
        view.setUint16(26, 1, true); // Planes
        view.setUint16(28, 1, true); // Bits per pixel (1-bit)
        view.setUint32(30, 0, true); // Compression (BI_RGB)
        view.setUint32(34, pixelArraySize, true); // Image size
        view.setInt32(38, 0, true); // X pixels/meter
        view.setInt32(42, 0, true); // Y pixels/meter
        view.setUint32(46, 2, true); // Colors used
        view.setUint32(50, 2, true); // Important colors
        
        // --- Color Table (Black & White) ---
        // Color 0: Black (0x000000)
        view.setUint32(54, 0x00000000, true);
        // Color 1: White (0xFFFFFF)
        view.setUint32(58, 0x00FFFFFF, true);
        
        // --- Pixel Data ---
        // We want light pixels (avg > 128) to be White (Color 1, Bit 1).
        // We want dark pixels (avg <= 128) to be Black (Color 0, Bit 0).
        const pixelDataStart = 62;
        
        for (let row = 0; row < HEIGHT; row++) {
          // Flip row index for bottom-up storage
          const srcRow = HEIGHT - 1 - row;
          
          for (let col = 0; col < WIDTH; col++) {
            const i = (srcRow * WIDTH + col) * 4;
            // Simple luminance threshold
            const avg = (data[i] + data[i+1] + data[i+2]) / 3;
            
            // 1 for white (lit), 0 for black (unlit)
            const bit = avg > 128 ? 1 : 0;
            
            // Set or clear bit in buffer
            if (bit) { // If bit is 1 (light pixel, maps to Color 1 / White)
              const byteIdx = pixelDataStart + row * rowSize + Math.floor(col / 8);
              const bitIdx = 7 - (col % 8);
              const currentByte = view.getUint8(byteIdx);
              view.setUint8(byteIdx, currentByte | (1 << bitIdx));
            } else { // If bit is 0 (dark pixel, maps to Color 0 / Black)
              const byteIdx = pixelDataStart + row * rowSize + Math.floor(col / 8);
              const bitIdx = 7 - (col % 8);
              const currentByte = view.getUint8(byteIdx);
              view.setUint8(byteIdx, currentByte & ~(1 << bitIdx)); // Ensure bit is cleared
            }
          }
        }
        
        resolve(new Uint8Array(buffer));
      };
      img.src = previewUrl!;
    });
  };

  const handleUpload = async () => {
    if (!isConnected) return;
    
    setIsProcessing(true);
    setStatus("idle");
    
    try {
      const bmpData = await processImage();
      if (!bmpData) {
        throw new Error("Failed to process image");
      }

      console.log(`Uploading BMP: ${bmpData.length} bytes`);
      const success = await uploadBootScreen(bmpData);
      
      if (success) {
        setStatus("success");
        setStatusMessage("Boot screen updated successfully!");
      } else {
        setStatus("error");
        setStatusMessage("Failed to upload boot screen. Check device connection.");
      }
    } catch (e) {
      console.error(e);
      setStatus("error");
      setStatusMessage("An unexpected error occurred.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClear = async () => {
    if (!isConnected) return;
    
    if (confirm("Are you sure you want to restore the default boot screen?")) {
      setIsProcessing(true);
      const success = await clearBootScreen();
      setIsProcessing(false);
      
      if (success) {
        setStatus("success");
        setStatusMessage("Default boot screen restored.");
        setSelectedFile(null);
        setPreviewUrl(null);
      } else {
        setStatus("error");
        setStatusMessage("Failed to clear boot screen.");
      }
    }
  };

  // Effect to update canvas preview with monochrome version
  useEffect(() => {
    if (previewUrl && canvasRef.current) {
        const img = new Image();
        img.onload = () => {
            const canvas = canvasRef.current!;
            const ctx = canvas.getContext("2d")!;
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, WIDTH, HEIGHT);
             const scale = Math.min(WIDTH / img.width, HEIGHT / img.height);
            const w = img.width * scale;
            const h = img.height * scale;
            const x = (WIDTH - w) / 2;
            const y = (HEIGHT - h) / 2;
            ctx.drawImage(img, x, y, w, h);
            
            // Dither / Threshold preview
            const imageData = ctx.getImageData(0, 0, WIDTH, HEIGHT);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                const avg = (data[i] + data[i+1] + data[i+2]) / 3;
                const val = avg > 128 ? 255 : 0;
                data[i] = val;
                data[i+1] = val;
                data[i+2] = val;
            }
            ctx.putImageData(imageData, 0, 0);
        };
        img.src = previewUrl;
    }
  }, [previewUrl]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          Boot Screen Editor
          <HelpButton helpKey="boot-screen" />
        </CardTitle>
        <CardDescription>
          Customize the startup logo (128x64 pixels). Images will be converted to 1-bit monochrome.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 space-y-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="boot-image">Select Image</Label>
              <Input 
                id="boot-image" 
                type="file" 
                accept="image/*" 
                onChange={handleFileChange}
                disabled={!isConnected || isProcessing}
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleUpload} 
                disabled={!selectedFile || !isConnected || isProcessing}
                className="flex-1"
              >
                {isProcessing ? "Uploading..." : "Upload to Device"}
                <Upload className="ml-2 h-4 w-4" />
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleClear}
                disabled={!isConnected || isProcessing}
                title="Restore default boot screen"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            
            {!isConnected && (
              <p className="text-sm text-muted-foreground">
                Connect device to enable uploading.
              </p>
            )}

            {status === "success" && (
              <div className="bg-green-50 text-green-800 border-green-200 border rounded-lg p-3 flex items-start gap-3">
                <Check className="h-4 w-4 mt-0.5" />
                <div>
                  <h5 className="font-medium text-sm">Success</h5>
                  <p className="text-sm opacity-90">{statusMessage}</p>
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="bg-destructive/15 text-destructive border-destructive/20 border rounded-lg p-3 flex items-start gap-3">
                <AlertCircle className="h-4 w-4 mt-0.5" />
                <div>
                  <h5 className="font-medium text-sm">Error</h5>
                  <p className="text-sm opacity-90">{statusMessage}</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col items-center justify-center bg-muted/30 rounded-lg p-4 border border-dashed">
             <Label className="mb-2 text-muted-foreground">Preview (1:1 scale)</Label>
             <div className="border border-foreground/20 shadow-sm bg-black">
                <canvas 
                    ref={canvasRef} 
                    width={WIDTH} 
                    height={HEIGHT} 
                    className="block"
                    style={{ 
                        width: "128px", 
                        height: "64px",
                        imageRendering: "pixelated" 
                    }}
                />
             </div>
             <p className="text-xs text-muted-foreground mt-2 text-center">
                Black pixels = OFF (OLED Background)<br/>
                White pixels = ON (Lit pixels)
             </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
