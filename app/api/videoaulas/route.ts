import { NextRequest, NextResponse } from 'next/server'

// Canais confiáveis para ENEM — priorizados na busca
const CANAIS_CONFIAVEIS = [
  'UCflPBEH4UemGRPj0fmxnNHg', // Professor Ferretto
  'UCT0JugAtGmqiYkwxFZOwAtg', // Descomplica
  'UCLNHmX3QEsjQbDTMnOYBL6g', // Me Salva
  'UCxcLQfCorHBf_FYpEMG7Cjg', // Stoodi
  'UCVngl-zszbWdMcRht9GVrnQ', // Principia Matemática
]

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const topico = searchParams.get('topico') || ''
  const area = searchParams.get('area') || ''
  const key = process.env.YOUTUBE_API_KEY

  if (!key) return NextResponse.json({ error: 'YouTube API key não configurada' }, { status: 500 })

  // Monta query otimizada pra ENEM
  const query = encodeURIComponent(`${topico || area} ENEM ${area} explicação`)

  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&maxResults=6&videoDuration=medium&relevanceLanguage=pt&regionCode=BR&key=${key}`

  const res = await fetch(url)
  const data = await res.json()

  const videos = (data.items || []).map((item: any) => ({
    videoId: item.id.videoId,
    titulo: item.snippet.title,
    canal: item.snippet.channelTitle,
    thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
    publicadoEm: item.snippet.publishedAt,
    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    embedUrl: `https://www.youtube.com/embed/${item.id.videoId}`,
  }))

  return NextResponse.json({ videos, topico, area })
}
