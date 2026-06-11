import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

export async function POST(req: NextRequest) {
  const { userId, dataProva, horasPorDia, tipoProva } = await req.json()

  let desempenho: any[] = []
  let questoesErradas: any[] = []

  if (userId) {
    const [{ data: desemp }, { data: erradas }] = await Promise.all([
      supabase.from('desempenho').select('*').eq('user_id', userId).order('percentual'),
      supabase.from('questoes_erradas')
        .select('questao_id, vezes_errada, questoes(area, subarea)')
        .eq('user_id', userId)
        .order('vezes_errada', { ascending: false })
        .limit(30)
    ])
    desempenho = desemp || []
    questoesErradas = erradas || []
  }

  const semanas = dataProva
    ? Math.max(1, Math.ceil((new Date(dataProva).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 7)))
    : 8

  const diagnostico = desempenho.length > 0
    ? desempenho.map((d: any) => `${d.area}: ${Math.round(d.percentual)}%`).join(', ')
    : 'Sem histórico — distribuir igualmente'

  const topicosProblema = questoesErradas.length > 0
    ? [...new Set(questoesErradas.filter((e: any) => e.questoes?.subarea).map((e: any) => `${e.questoes.area} > ${e.questoes.subarea}`))].slice(0, 8).join(', ')
    : 'Sem dados ainda'

  const piorArea = desempenho.length > 0 ? desempenho[0] : null
  const melhorArea = desempenho.length > 0 ? desempenho[desempenho.length - 1] : null

  const promptFinal = `Especialista em preparação para ${tipoProva || 'ENEM'} no Brasil.

DIAGNÓSTICO REAL DO ALUNO:
- Desempenho: ${diagnostico}
- Pior área: ${piorArea ? `${piorArea.area} (${Math.round(piorArea.percentual)}%)` : 'Sem dados'}
- Melhor área: ${melhorArea ? `${melhorArea.area} (${Math.round(melhorArea.percentual)}%)` : 'Sem dados'}
- Tópicos com mais erros: ${topicosProblema}
- Semanas até a prova: ${semanas}
- Horas por dia: ${horasPorDia || 2}h

REGRAS: Priorize áreas fracas. Últimas 2 semanas = revisão + simulados. Atividades específicas citando tópicos reais. Máx ${Math.min(semanas, 12)} semanas.

Retorne APENAS JSON sem markdown:
{"semanas":[{"semana":1,"foco_principal":"área","foco_secundario":"área","horas_estudo":14,"atividades":["atividade específica 1","atividade 2","atividade 3"],"simulado":false,"redacao":true,"flashcards":"área","meta_acerto":45}],"resumo":"diagnóstico em 2 frases"}`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: promptFinal }],
    max_tokens: 2500,
    temperature: 0.6,
  })

  const text = completion.choices[0].message.content || ''
  try {
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    return NextResponse.json({ plano: parsed.semanas, resumo: parsed.resumo })
  } catch {
    return NextResponse.json({ error: 'Erro ao gerar plano' }, { status: 500 })
  }
}
