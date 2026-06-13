import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const topico = searchParams.get('topico') || ''
  const area = searchParams.get('area') || ''
  const enunciado = searchParams.get('enunciado') || ''
  const key = process.env.YOUTUBE_API_KEY

  if (!key) return NextResponse.json({ error: 'YouTube API key não configurada' }, { status: 500 })

  let query = ''

  // Se tem enunciado da questão, usa IA pra extrair o tema exato
  if (enunciado) {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: `Você é um especialista em ENEM. Leia esse trecho de questão e retorne APENAS uma query de busca do YouTube (máximo 6 palavras) que encontre uma videoaula explicando o conceito cobrado. Sem aspas, sem pontuação, apenas as palavras-chave do conteúdo específico.

Área: ${area}
Questão: ${enunciado.slice(0, 300)}

Query:`
        }],
        max_tokens: 30,
        temperature: 0.1,
      })
      const queryIA = completion.choices[0].message.content?.trim() || ''
      query = `${queryIA} ENEM resolução`
    } catch {
      query = `${topico || area} ENEM resolução exercício`
    }
  } else if (topico) {
    query = `${topico} ENEM resolução exercício`
  } else {
    query = `${area} ENEM revisão`
  }

  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=6&relevanceLanguage=pt&regionCode=BR&key=${key}`

  const res = await fetch(url)
  const data = await res.json()

  const videos = (data.items || []).map((item: any) => ({
    videoId: item.id.videoId,
    titulo: item.snippet.title,
    canal: item.snippet.channelTitle,
    thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    embedUrl: `https://www.youtube.com/embed/${item.id.videoId}`,
  }))

  return NextResponse.json({ videos, query, topico, area })
}
