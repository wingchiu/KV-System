import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { cookies } from 'next/headers'

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(cookieStore)
    const { id } = params

    // Delete the image from storage
    const { data: image } = await supabase
      .from('images')
      .select('image_url')
      .eq('id', id)
      .single()

    if (image?.image_url) {
      const path = new URL(image.image_url).pathname
      const { error: storageError } = await supabase
        .storage
        .from('images')
        .remove([path.split('/').pop() || ''])

      if (storageError) {
        console.error('Error deleting from storage:', storageError)
      }
    }

    // Delete the image record from the database
    const { error: dbError } = await supabase
      .from('images')
      .delete()
      .eq('id', id)

    if (dbError) {
      throw dbError
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting image:', error)
    return NextResponse.json(
      { error: 'Failed to delete image' },
      { status: 500 }
    )
  }
}
