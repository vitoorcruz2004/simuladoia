import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const AREA_MAP: Record<string, string> = {
  'linguagens': 'Linguagens',
  'humanas': 'Ciências Humanas',
  'natureza': 'Ciências da Natureza',
  'matematica': 'Matemática',
  'matematica-tecnologias': 'Matemática',
  'linguagens-codigos': 'Linguagens',
  'ciencias-humanas': 'Ciências Humanas',
  'ciencias-natureza': 'Ciências da Natureza',
}

function mapArea(raw: string): string {
  const key = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-')
  return AREA_MAP[key] || raw
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const ano = searchParams.get('ano') || '2023'
  const limite = parseInt(searchParams.get('limite') || '50')

  try {
    // Busca lista de questões do enem.dev
    const res = await fetch(`https://api.enem.dev/v1/exams/${ano}/questions?limit=${limite}&offset=0`, {
      headers: { 'Accept': 'application/json' }
    })

    if (!res.ok) {
      return NextResponse.json({ error: `API enem.dev retornou ${res.status}` }, { status: 500 })
    }

    const data = await res.json()
    const questoes = data.questions || data || []

    if (!Array.isArray(questoes) || questoes.length === 0) {
      return NextResponse.json({ error: 'Nenhuma questão retornada', data }, { status: 500 })
    }

    let importadas = 0
    let erros = 0

    for (const q of questoes) {
      try {
        const alternativas = (q.alternatives || q.alternativas || []).map((a: any) => ({
          letra: a.letter || a.letra,
          texto: a.text || a.texto || ''
        }))

        const respostaCorreta = q.correctAlternative || q.alternativaCorreta || q.gabarito || 'A'

        const { error } = await supabase.from('questoes').upsert({
          id: q.id || undefined,
          area: mapArea(q.discipline || q.area || q.disciplina || 'Linguagens'),
          subarea: q.subject || q.subarea || q.assunto || null,
          enunciado: q.title || q.enunciado || q.statement || '',
          contexto: q.context || q.contexto || q.texts?.map((t: any) => t.text || t.texto || '').join('\n\n') || null,
          alternativas: alternativas,
          resposta_correta: respostaCorreta,
          explicacao: null,
          ano: parseInt(ano),
          fonte: 'ENEM',
          dificuldade: 2,
        }, { onConflict: 'id' })

        if (error) { erros++; console.error(error) }
        else importadas++
      } catch (e) {
        erros++
      }
    }

    return NextResponse.json({
      sucesso: true,
      ano,
      importadas,
      erros,
      total: questoes.length
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
