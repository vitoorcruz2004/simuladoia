import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const DISCIPLINES = [
  { value: 'matematica', area: 'Matemática' },
  { value: 'linguagens', area: 'Linguagens' },
  { value: 'ciencias-humanas', area: 'Ciências Humanas' },
  { value: 'ciencias-natureza', area: 'Ciências da Natureza' },
]

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const ano = searchParams.get('ano') || '2023'
  const limite = parseInt(searchParams.get('limite') || '45')

  let totalImportadas = 0
  let totalErros = 0

  for (const disc of DISCIPLINES) {
    try {
      const res = await fetch(
        `https://api.enem.dev/v1/exams/${ano}/questions?discipline=${disc.value}&limit=${limite}&offset=0`,
        { headers: { 'Accept': 'application/json' } }
      )

      if (!res.ok) { totalErros++; continue }

      const data = await res.json()
      const questoes = data.questions || []

      for (const q of questoes) {
        // Pula questões de língua estrangeira
        if (q.language === 'espanhol' || q.language === 'ingles') continue

        const alternativas = (q.alternatives || []).map((a: any) => ({
          letra: a.letter,
          texto: a.text || ''
        }))

        const enunciado = q.alternativesIntroduction || q.title || ''
        const contexto = q.context || null

        if (!enunciado || alternativas.length === 0) continue

        const { error } = await supabase.from('questoes').insert({
          area: disc.area,
          subarea: null,
          enunciado,
          contexto,
          alternativas,
          resposta_correta: q.correctAlternative || 'A',
          explicacao: null,
          ano: parseInt(ano),
          fonte: 'ENEM',
          dificuldade: 2,
        })

        if (error && !error.message.includes('duplicate')) totalErros++
        else totalImportadas++
      }
    } catch (e) {
      totalErros++
    }
  }

  return NextResponse.json({
    sucesso: true,
    ano,
    importadas: totalImportadas,
    erros: totalErros,
  })
}
