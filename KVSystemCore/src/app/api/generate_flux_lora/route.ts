import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    console.log('[API] Sending request to Flux LoRA with payload:', {
      ...payload,
      positive_prompt: payload.positive_prompt.substring(0, 100) + '...' // Truncate for logging
    })

    const response = await fetch('http://127.0.0.1:5000/generate_flux_lora', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('[API] Error response from Flux LoRA:', errorData)
      return NextResponse.json({
        success: false,
        error: errorData.error || 'Failed to generate image'
      }, { status: response.status })
    }

    const data = await response.json()
    console.log('[API] Received successful response from Flux LoRA')
    return NextResponse.json(data)
  } catch (error) {
    console.error('[API] Error in generate_flux_lora:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
