import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Forward the request to the VLM service
    const formData = await request.formData();
    
    const response = await fetch('http://localhost:5000/generate_prompt', {
      method: 'POST',
      body: formData,
    });

    // Get the response data
    const data = await response.json();

    // Return the response
    return NextResponse.json(data);
  } catch (error) {
    console.error('VLM service error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal Server Error',
        steps: [
          {
            name: 'api_route',
            success: false,
            error: error instanceof Error ? error.message : 'Internal Server Error'
          }
        ]
      }, 
      { status: 500 }
    );
  }
}
