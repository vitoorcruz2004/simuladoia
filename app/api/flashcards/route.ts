import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

export async function POST(req: NextRequest) {
  const { userId, area, quantidade = 10 } = await req.json()

  let topicosErrados: string[] = []
  let percentualArea = 50

  if (userId) {
    const { data: desemp } = await supabase
      .from('desempenho').select('*').eq('user_id', userId).eq('area', area)
    if (desemp && desemp.length > 0) {
      percentualArea = Math.round(desemp.reduce((a: number, d: any) => a + d.percentual, 0) / desemp.length)
      topicosErrados = desemp
        .filter((d: any) => d.subarea && d.percentual < 60)
        .sort((a: any, b: any) => a.percentual - b.percentual)
        .slice(0, 5)
        .map((d: any) => d.subarea)
    }

    const { data: erradas } = await supabase
      .from('questoes_erradas')
      .select('questao_id, vezes_errada, questoes(area, subarea)')
      .eq('user_id', userId)
      .order('vezes_errada', { ascending: false })
      .limit(20)

    if (erradas) {
      const subareasErradas = erradas
        .filter((e: any) => e.questoes?.area === area && e.questoes?.subarea)
        .map((e: any) => e.questoes.subarea)
      const combined = topicosErrados.concat(subareasErradas)
      const unique: string[] = []
      combined.forEach(t => { if (!unique.includes(t)) unique.push(t) })
      topicosErrados = unique.slice(0, 5)
    }
  }

  const focoPorcentagem = percentualArea < 40 ? 'básico e intermediário' : percentualArea < 70 ? 'intermediário e avançado' : 'avançado e revisão'
  const focoTopicos = topicosErrados.length > 0
    ? `Foque especialmente nos tópicos onde o aluno tem dificuldade: ${topicosErrados.join(', ')}.`
    : `Cubra os tópicos mais importantes do ENEM nessa área.`

  const prompt = `Você é um especialista em preparação para o ENEM brasileiro.

CONTEXTO DO ALUNO:
- Área: ${area}
- Aproveitamento atual: ${percentualArea}%
- Nível dos cards: ${focoPorcentagem}
- ${focoTopicos}

Crie ${quantidade} flashcards personalizados focando nos pontos fracos.
Perguntas diretas, respostas concisas (máx 3 linhas), em português.

Retorne APENAS JSON sem markdown:
{"flashcards":[{"frente":"pergunta","verso":"resposta","topico":"tópico"}]}`

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
        user_id: userId, area,
        frente: c.frente, verso: c.verso, fonte: 'IA',
        proxima_revisao: new Date().toISOString().split('T')[0],
      }))
      await supabase.from('flashcards').insert(rows)
    }

    return NextResponse.json({ flashcards: cards, percentualArea, topicosErrados })
  } catch {
    return NextResponse.json({ error: 'Erro ao gerar flashcards' }, { status: 500 })
  }
}
