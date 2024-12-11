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

export default function PromptEditor() {
  const { selectedStyle } = useStyle()
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [width, setWidth] = useState(1024)
  const [height, setHeight] = useState(1024)
  const [variants, setVariants] = useState(1)
  const [autoHistory, setAutoHistory] = useState(true)

  useEffect(() => {
    if (selectedStyle) {
      setPrompt(selectedStyle.prompt)
    }
  }, [selectedStyle])

  const handleGenerate = async () => {
    setIsGenerating(true)
    // TODO: Implement generation logic
    setTimeout(() => setIsGenerating(false), 2000)
  }

  const handleStop = () => {
    // TODO: Implement stop generation logic
    setIsGenerating(false)
  }

  const handleAddToHistory = async () => {
    // TODO: Implement add to history logic
  }

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
              disabled={isGenerating}
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
        <Card className="p-4 flex items-center justify-center min-h-[512px]">
          <div className="text-center text-muted-foreground">
            Generated image will appear here
          </div>
        </Card>

        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={handleAddToHistory}
            className="flex-1 mr-4"
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
  )
}