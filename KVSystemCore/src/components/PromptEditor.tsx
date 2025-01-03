'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Download, Loader2, History, StopCircle } from 'lucide-react'
import { useStyle } from '@/lib/contexts/StyleContext'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import { useProduct } from '@/lib/contexts/ProductContext'
import { supabase } from '@/lib/supabase'

export default function PromptEditor() {
  const { selectedStyle } = useStyle()
  const { selectedProduct } = useProduct()
  const { toast } = useToast()
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [width, setWidth] = useState(1024)
  const [height, setHeight] = useState(1024)
  const [variants, setVariants] = useState(1)
  const [autoHistory, setAutoHistory] = useState(true)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)

  useEffect(() => {
    if (selectedStyle) {
      setPrompt(selectedStyle.prompt)
    }
  }, [selectedStyle])

  const handleGenerate = async () => {
    if (!selectedStyle || !selectedProduct) {
      toast({
        title: "Error",
        description: "Please select both a style and a product before generating",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsGenerating(true);
      setGeneratedImage(null);

      // Extract LoRA name from path (e.g., 'models/loras/my_lora.safetensors' -> 'my_lora')
      const lora_name = selectedProduct.lora_path.split('/').pop()?.replace('.safetensors', '') || selectedProduct.lora_path;
      console.log('[Generate] Product:', {
        name: selectedProduct.name,
        lora_path: selectedProduct.lora_path,
        extracted_lora_name: lora_name
      });

      // Combine style prompt with product name
      const combinedPrompt = selectedStyle.prompt.replace('{product}', selectedProduct.name);
      console.log('[Generate] Style:', {
        name: selectedStyle.name,
        original_prompt: selectedStyle.prompt,
        combined_prompt: combinedPrompt
      });

      // Prepare the request payload according to the API spec
      const payload = {
        width: width,
        height: height,
        model_name: "flux1-dev-Q4_0.gguf",    // Base model name
        lora_name: selectedProduct.lora_path.split('/').pop() || "",  // Just the filename without path
        positive_prompt: combinedPrompt,
        negative_prompt: "",
        batch_size: variants
      };

      // Validate lora_name is one of the allowed values
      const allowedLoras = [
        'F.1电商系列-场景插画_V1.0.safetensors',
        'Flux_小红书真实风格丨日常照片丨极致逼真_V1.safetensors',
        'NCMocha.safetensors',
        'XLabs F.1 Realism LoRA_V1.safetensors'
      ];

      if (!allowedLoras.includes(payload.lora_name)) {
        throw new Error(`Invalid LoRA name. Must be one of: ${allowedLoras.join(', ')}`);
      }

      console.log('[Generate] Sending request with payload:', JSON.stringify(payload, null, 2));

      const response = await fetch('/api/generate_flux_lora', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log('[Generate] Received response:', data);

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate image');
      }

      if (!data.images || data.images.length === 0) {
        throw new Error('No images were generated');
      }

      // Log image data info for debugging
      const imageData = data.images[0];
      console.log('Image data type:', typeof imageData);
      console.log('Image data length:', imageData.length);
      if (typeof imageData === 'string') {
        console.log('Image data preview:', imageData.substring(0, 100));
      }

      // Set the image URL with proper data URL prefix if needed
      const imageUrl = imageData.startsWith('data:image') 
        ? imageData 
        : `data:image/png;base64,${imageData}`;

      console.log('[Generate] Setting image URL:', imageUrl.substring(0, 100) + '...');
      setGeneratedImage(imageUrl);

      toast({
        title: "Success",
        description: "Image generated successfully",
      });

      if (autoHistory) {
        await handleAddToHistory();
      }
    } catch (error) {
      console.error('[Generate] Error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate image",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStop = () => {
    // TODO: Implement stop generation logic when API supports it
    setIsGenerating(false);
  };

  const handleAddToHistory = async () => {
    if (!selectedStyle || !selectedProduct || !generatedImage) {
      toast({
        title: "Error",
        description: "No image to add to history",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: generatedImage,
          prompt,
          style_id: selectedStyle.id,
          product_id: selectedProduct.id,
          width,
          height,
          user_id: null // TODO: Add user authentication
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add image to history');
      }

      toast({
        title: "Success",
        description: "Image added to history",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add image to history",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your prompt here..."
          className="h-48 resize-none"
        />
        
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Resolution</Label>
            <Tabs defaultValue="custom" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="portrait">2:3</TabsTrigger>
                <TabsTrigger value="landscape">3:2</TabsTrigger>
                <TabsTrigger value="square">1:1</TabsTrigger>
                <TabsTrigger value="custom">Custom</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Width: {width}px</Label>
              <Slider
                value={[width]}
                onValueChange={(value) => setWidth(value[0])}
                min={512}
                max={2048}
                step={64}
              />
            </div>
            <div className="space-y-2">
              <Label>Height: {height}px</Label>
              <Slider
                value={[height]}
                onValueChange={(value) => setHeight(value[0])}
                min={512}
                max={2048}
                step={64}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Variants: {variants}</Label>
            <Slider
              value={[variants]}
              onValueChange={(value) => setVariants(value[0])}
              min={1}
              max={4}
              step={1}
            />
          </div>

          <div className="space-y-2">
            <Button 
              onClick={handleGenerate} 
              className="w-full"
              disabled={isGenerating || !selectedStyle || !selectedProduct}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate'
              )}
            </Button>

            {isGenerating && (
              <Button 
                onClick={handleStop}
                variant="destructive"
                className="w-full"
              >
                <StopCircle className="mr-2 h-4 w-4" />
                Stop Generation
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <Card className="p-4 flex items-center justify-center min-h-[512px] relative bg-muted">
          {generatedImage ? (
            <div className="relative w-full h-full flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={generatedImage}
                alt="Generated image"
                style={{
                  maxWidth: '100%',
                  height: 'auto',
                  marginBottom: '10px'
                }}
                onLoad={() => {
                  console.log('[Generate] Image loaded successfully');
                  toast({
                    title: "Success",
                    description: "Image loaded successfully",
                  });
                }}
                onError={(e) => {
                  console.error('[Generate] Image load error:', e);
                  console.log('Failed image URL:', generatedImage?.substring(0, 100));
                  toast({
                    title: "Error",
                    description: "Failed to load generated image",
                    variant: "destructive",
                  });
                }}
              />
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              Generated image will appear here
            </div>
          )}
        </Card>

        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={handleAddToHistory}
            className="flex-1 mr-4"
            disabled={!generatedImage}
          >
            <History className="mr-2 h-4 w-4" />
            Add to History
          </Button>
          
          <div className="flex items-center space-x-2">
            <Label htmlFor="auto-history">Auto History</Label>
            <Switch
              id="auto-history"
              checked={autoHistory}
              onCheckedChange={setAutoHistory}
            />
          </div>
        </div>
      </div>
    </div>
  );
}