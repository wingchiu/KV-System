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
  const [generatedImages, setGeneratedImages] = useState<Array<{
    image_url: string;
    generated_at: string;
    resolution: string;
    seed: number;
  }>>([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

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
      setGeneratedImages([]);

      // Extract LoRA name from path
      const lora_name = selectedProduct.lora_path.split('/').pop() || "";
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

      const payload = {
        width,
        height,
        lora_name,
        positive_prompt: combinedPrompt,
        negative_prompt: "",
        batch_size: variants
      };

      console.log('[Generate] Sending request with payload:', JSON.stringify(payload, null, 2));

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log('[Generate] Received response:', data);

      if (!data || Object.keys(data).length === 0) {
        throw new Error('No result received from server');
      }

      // Process all images from all nodes
      const allImages: Array<{
        image_url: string;
        generated_at: string;
        resolution: string;
        seed: number;
      }> = [];

      for (const nodeId in data) {
        const images = data[nodeId];
        if (Array.isArray(images)) {
          images.forEach(imageData => {
            if (imageData.image_url) {
              allImages.push({
                image_url: imageData.image_url,
                generated_at: imageData.generated_at || new Date().toISOString(),
                resolution: `${width}x${height}`,
                seed: imageData.seed || 0
              });
            }
          });
        }
      }

      if (allImages.length === 0) {
        throw new Error('No valid images were generated');
      }

      setGeneratedImages(allImages);
      setCurrentImageIndex(0);
      setGeneratedImage(allImages[0].image_url);

      toast({
        title: "Success",
        description: "Images generated successfully",
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
      console.log('[History] Missing required data:', {
        hasStyle: Boolean(selectedStyle),
        hasProduct: Boolean(selectedProduct),
        hasImage: Boolean(generatedImage)
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
          image_url: generatedImages[currentImageIndex].image_url,
          prompt: selectedStyle.prompt,
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
      console.error('[History] Error:', error);
      // Don't show error toast to user since this is a background operation
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
        {isGenerating ? (
          <Card className="p-4 flex items-center justify-center h-[512px]">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p>Generating image...</p>
            </div>
          </Card>
        ) : generatedImage ? (
          <Card className="p-4 relative">
            <div className="relative flex flex-col h-[512px]">
              <div className="flex-1 relative overflow-hidden">
                <img 
                  src={generatedImages[currentImageIndex].image_url} 
                  alt="Generated" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    console.error('[Generate] Image load error for URL:', generatedImages[currentImageIndex].image_url);
                    toast({
                      title: "Error",
                      description: "Failed to load generated image. Please try again.",
                      variant: "destructive",
                    });
                  }}
                  onLoad={() => {
                    console.log('[Generate] Image loaded successfully:', generatedImages[currentImageIndex].image_url);
                  }}
                />
                {generatedImages.length > 1 && (
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setCurrentImageIndex((prev) => 
                        prev > 0 ? prev - 1 : generatedImages.length - 1
                      )}
                      disabled={isGenerating}
                    >
                      Previous
                    </Button>
                    <span className="bg-black bg-opacity-50 text-white px-2 py-1 rounded">
                      {currentImageIndex + 1} / {generatedImages.length}
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setCurrentImageIndex((prev) => 
                        prev < generatedImages.length - 1 ? prev + 1 : 0
                      )}
                      disabled={isGenerating}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                <p>Generated: {new Date(generatedImages[currentImageIndex].generated_at).toLocaleString()}</p>
                <p>Resolution: {generatedImages[currentImageIndex].resolution}</p>
                <p>Seed: {generatedImages[currentImageIndex].seed}</p>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-4 flex items-center justify-center h-[512px] bg-muted">
            <div className="text-center text-muted-foreground">
              Generated image will appear here
            </div>
          </Card>
        )}
        
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