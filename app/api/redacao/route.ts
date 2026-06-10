import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  const { tema, texto } = await req.json()

  const prompt = `Você é um corretor especialista em redações do ENEM com anos de experiência nas bancas do INEP.

Corrija esta redação dissertativo-argumentativa com rigor e precisão seguindo os critérios oficiais do ENEM.

TEMA: ${tema}

REDAÇÃO:
${texto}

Retorne APENAS um JSON válido com este formato exato, sem markdown, sem texto adicional:
{
  "nota_total": número de 0 a 1000 (soma das 5 competências),
  "competencias": [
    {
      "numero": 1,
      "nome": "Domínio da norma culta",
      "nota": número de 0 a 200,
      "feedback": "feedback específico e construtivo sobre esta competência"
    },
    {
      "numero": 2,
      "nome": "Compreensão do tema",
      "nota": número de 0 a 200,
      "feedback": "feedback específico"
    },
    {
      "numero": 3,
      "nome": "Seleção e organização das informações",
      "nota": número de 0 a 200,
      "feedback": "feedback específico"
    },
    {
      "numero": 4,
      "nome": "Coesão e coerência",
      "nota": número de 0 a 200,
      "feedback": "feedback específico"
    },
    {
      "numero": 5,
      "nome": "Proposta de intervenção",
      "nota": número de 0 a 200,
      "feedback": "feedback específico sobre a proposta de intervenção"
    }
  ],
  "pontos_fortes": ["ponto forte 1", "ponto forte 2"],
  "pontos_melhora": ["o que melhorar 1", "o que melhorar 2", "o que melhorar 3"],
  "comentario_geral": "comentário geral sobre a redação em 2-3 frases"
}`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1500,
    temperature: 0.3,
  })

  const text = completion.choices[0].message.content || ''

  try {
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    return NextResponse.json({ correcao: parsed })
  } catch {
    return NextResponse.json({ error: 'Erro ao parsear correção' }, { status: 500 })
  }
}
