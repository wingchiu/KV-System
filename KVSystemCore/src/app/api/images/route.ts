import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('kv_images')
    .select(`
      *,
      kv_styles (name),
      products (name)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { image_url, prompt, style_id, product_id, width, height, user_id } = body

  const { data, error } = await supabase
    .from('kv_images')
    .insert([{
      image_url,
      prompt,
      style_id,
      product_id,
      width,
      height,
      user_id
    }])
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const userId = searchParams.get('userId')

  if (!id || !userId) {
    return NextResponse.json({ error: 'ID and User ID are required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('kv_images')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}