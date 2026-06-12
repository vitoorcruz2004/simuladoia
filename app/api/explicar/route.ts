import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  const { enunciado, contexto, alternativas, respostaCorreta, respostaDada, area } = await req.json()

  const altCorreta = alternativas.find((a: any) => a.letra === respostaCorreta)
  const altErrada = alternativas.find((a: any) => a.letra === respostaDada)

  const prompt = `Você é um professor especialista em ${area} para o ENEM. Um aluno errou uma questão e precisa entender o erro.

QUESTÃO:
${contexto ? `Contexto: ${contexto}\n\n` : ''}${enunciado}

ALTERNATIVA QUE O ALUNO ESCOLHEU (errada): ${respostaDada}) ${altErrada?.texto || ''}
ALTERNATIVA CORRETA: ${respostaCorreta}) ${altCorreta?.texto || ''}

Explique de forma didática e objetiva:
1. Por que a alternativa ${respostaDada} está ERRADA — identifique o erro de raciocínio comum
2. Por que a alternativa ${respostaCorreta} está CORRETA — explique o conceito que leva à resposta
3. Uma dica rápida pra não errar questões assim no futuro

Seja direto, use linguagem simples, máximo 4 parágrafos. Não use markdown excessivo.`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 600,
    temperature: 0.3,
  })

  const explicacao = completion.choices[0].message.content || ''
  return NextResponse.json({ explicacao })
}
