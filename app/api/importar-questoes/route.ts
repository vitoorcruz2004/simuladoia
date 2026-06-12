import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const AREA_MAP: Record<string, string> = {
  'matematica': 'Matemática',
  'linguagens': 'Linguagens',
  'humanas': 'Ciências Humanas',
  'ciencias-humanas': 'Ciências Humanas',
  'natureza': 'Ciências da Natureza',
  'ciencias-natureza': 'Ciências da Natureza',
  'ciencias da natureza': 'Ciências da Natureza',
  'ciências da natureza': 'Ciências da Natureza',
  'ciências humanas': 'Ciências Humanas',
  'matemática': 'Matemática',
  'linguagens e códigos': 'Linguagens',
}

function mapArea(raw: string): string {
  const key = (raw || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
  return AREA_MAP[key] || AREA_MAP[raw.toLowerCase()] || 'Linguagens'
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const ano = searchParams.get('ano') || '2023'
  const limite = parseInt(searchParams.get('limite') || '200')

  try {
    // Limpa questões do ano para reimportar corretamente
    const limpar = searchParams.get('limpar') === 'true'
    if (limpar) {
      await supabase.from('questoes').delete().eq('ano', parseInt(ano))
    }

    let importadas = 0
    let erros = 0
    let offset = 0
    const pageSize = 50

    while (importadas + erros < limite) {
      const res = await fetch(
        `https://api.enem.dev/v1/exams/${ano}/questions?limit=${pageSize}&offset=${offset}`,
        { headers: { 'Accept': 'application/json' } }
      )
      if (!res.ok) break

      const data = await res.json()
      const questoes = data.questions || []
      if (questoes.length === 0) break

      for (const q of questoes) {
        try {
          // Pula língua estrangeira
          if (q.language === 'espanhol' || q.language === 'ingles' || q.language === 'inglês') continue

          const areaRaw = q.discipline || 'linguagens'
          const area = mapArea(areaRaw)

          const alternativas = (q.alternatives || []).map((a: any) => ({
            letra: a.letter,
            texto: a.text || ''
          }))

          const enunciado = q.alternativesIntroduction || q.title || ''
          if (!enunciado || alternativas.length === 0) continue

          const fonte = `ENEM ${ano} — Questão ${q.index}`

          const { error } = await supabase.from('questoes').insert({
            area,
            subarea: null,
            enunciado,
            contexto: q.context || null,
            alternativas,
            resposta_correta: q.correctAlternative || 'A',
            explicacao: null,
            ano: parseInt(ano),
            fonte,
            dificuldade: 2,
          })

          if (error) erros++
          else importadas++
        } catch { erros++ }
      }

      offset += pageSize
      if (!data.metadata?.hasMore) break
    }

    return NextResponse.json({ sucesso: true, ano, importadas, erros })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
