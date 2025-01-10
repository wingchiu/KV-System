import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    console.log('[API] Received generate request with payload:', payload);

    const response = await fetch('https://kv-system-server-production.up.railway.app/generate_flux_lora', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        width: payload.width,
        height: payload.height,
        lora_name: payload.lora_name,
        model_name: "flux1-dev-Q4_0.gguf",
        positive_prompt: payload.positive_prompt,
        negative_prompt: payload.negative_prompt || "",
        batch_size: payload.batch_size || 1
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API] Error from production server:', errorText);
      return NextResponse.json(
        { success: false, error: `Server error: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[API] Raw response from server:', data);

    // Pass through the raw response as it contains the node IDs and image data
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API] Error in generate route:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}
