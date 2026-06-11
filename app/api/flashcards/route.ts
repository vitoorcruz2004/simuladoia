import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

export async function POST(req: NextRequest) {
  const { userId, area, subarea, quantidade = 10 } = await req.json()

  const prompt = `Você é um especialista em preparação para o ENEM brasileiro.

Crie ${quantidade} flashcards de estudo para a área "${area}"${subarea ? `, subárea "${subarea}"` : ''}.

Os flashcards devem:
- Ter perguntas diretas e objetivas na frente
- Respostas completas mas concisas no verso
- Cobrir conceitos importantes que caem no ENEM
- Variar entre definições, aplicações, fórmulas, datas e comparações
- Ser em português brasileiro

Retorne APENAS JSON válido sem markdown:
{
  "flashcards": [
    {
      "frente": "pergunta ou conceito",
      "verso": "resposta completa e didática"
    }
  ]
}`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 2000,
    temperature: 0.7,
  })

  const text = completion.choices[0].message.content || ''
  try {
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    const cards = parsed.flashcards || []

    if (userId) {
      const rows = cards.map((c: any) => ({
        user_id: userId, area, frente: c.frente, verso: c.verso, fonte: 'IA',
        proxima_revisao: new Date().toISOString().split('T')[0],
      }))
      await supabase.from('flashcards').insert(rows)
    }

    return NextResponse.json({ flashcards: cards })
  } catch {
    return NextResponse.json({ error: 'Erro ao gerar flashcards' }, { status: 500 })
  }
}
