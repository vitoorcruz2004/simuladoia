import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')
  const area = searchParams.get('area')

  if (slug) {
    const { data } = await supabase.from('repositorio').select('*').eq('slug', slug).single()
    if (data) await supabase.from('repositorio').update({ visualizacoes: (data.visualizacoes || 0) + 1 }).eq('slug', slug)
    return NextResponse.json({ conteudo: data })
  }

  if (area) {
    const { data } = await supabase.from('repositorio').select('id,area,topico,slug,visualizacoes').eq('area', area).order('topico')
    return NextResponse.json({ topicos: data || [] })
  }

  const { data } = await supabase.from('repositorio').select('id,area,topico,slug,visualizacoes').order('area').order('topico')
  return NextResponse.json({ topicos: data || [] })
}
