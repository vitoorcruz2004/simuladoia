import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

const CONTEUDO_ENEM = [
  { area: 'Matemática', topico: 'Funções', subtopicos: ['Função do 1º grau','Função do 2º grau','Função exponencial','Função logarítmica'] },
  { area: 'Matemática', topico: 'Geometria Plana', subtopicos: ['Triângulos','Quadriláteros','Circunferência','Áreas'] },
  { area: 'Matemática', topico: 'Geometria Espacial', subtopicos: ['Prismas','Pirâmides','Cilindro','Cone','Esfera'] },
  { area: 'Matemática', topico: 'Progressões', subtopicos: ['Progressão Aritmética','Progressão Geométrica'] },
  { area: 'Matemática', topico: 'Probabilidade e Estatística', subtopicos: ['Probabilidade','Média, moda e mediana','Análise combinatória'] },
  { area: 'Matemática', topico: 'Trigonometria', subtopicos: ['Seno, cosseno e tangente','Lei dos senos e cossenos','Trigonometria no ciclo'] },
  { area: 'Matemática', topico: 'Logaritmo', subtopicos: ['Definição e propriedades','Equações logarítmicas'] },
  { area: 'Linguagens', topico: 'Interpretação de Texto', subtopicos: ['Inferência','Intertextualidade','Coesão e coerência'] },
  { area: 'Linguagens', topico: 'Literatura Brasileira', subtopicos: ['Modernismo','Realismo','Romantismo','Pré-modernismo'] },
  { area: 'Linguagens', topico: 'Gramática', subtopicos: ['Morfologia','Sintaxe','Semântica','Ortografia'] },
  { area: 'Linguagens', topico: 'Figuras de Linguagem', subtopicos: ['Metáfora','Ironia','Hipérbole','Eufemismo'] },
  { area: 'Ciências Humanas', topico: 'História do Brasil', subtopicos: ['Colonização','Império','República','Ditadura Militar','Redemocratização'] },
  { area: 'Ciências Humanas', topico: 'História Geral', subtopicos: ['Revoluções','Guerras Mundiais','Guerra Fria','Globalização'] },
  { area: 'Ciências Humanas', topico: 'Geografia do Brasil', subtopicos: ['Biomas','Clima','Urbanização','Questão agrária'] },
  { area: 'Ciências Humanas', topico: 'Filosofia', subtopicos: ['Filosofia Grega','Iluminismo','Existencialismo','Ética'] },
  { area: 'Ciências Humanas', topico: 'Sociologia', subtopicos: ['Cultura','Cidadania','Movimentos sociais','Trabalho'] },
  { area: 'Ciências da Natureza', topico: 'Biologia', subtopicos: ['Genética','Ecologia','Evolução','Citologia'] },
  { area: 'Ciências da Natureza', topico: 'Química', subtopicos: ['Estequiometria','Termoquímica','Eletroquímica','Química orgânica'] },
  { area: 'Ciências da Natureza', topico: 'Física', subtopicos: ['Cinemática','Dinâmica','Termodinâmica','Eletricidade','Ondulatória'] },
]

function toSlug(area: string, topico: string) {
  const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  return `${normalize(area)}-${normalize(topico)}`
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const idx = parseInt(searchParams.get('idx') || '0')
  const item = CONTEUDO_ENEM[idx]
  if (!item) return NextResponse.json({ concluido: true, total: CONTEUDO_ENEM.length })

  const slug = toSlug(item.area, item.topico)

  // Verifica se já existe
  const { data: existe } = await supabase.from('repositorio').select('id').eq('slug', slug).single()
  if (existe) return NextResponse.json({ pulado: true, slug, proximo: idx + 1, total: CONTEUDO_ENEM.length })

  const prompt = `Você é um professor especialista em preparação para o ENEM brasileiro. Crie um conteúdo completo e didático sobre "${item.topico}" da área de "${item.area}" para o ENEM.

Retorne APENAS JSON válido sem markdown:
{
  "resumo": "Resumo didático de 3-4 parágrafos explicando o conceito do zero, com linguagem acessível para estudantes do ensino médio. Inclua definições, exemplos práticos e como o conceito aparece no ENEM.",
  "mapa_mental": {
    "centro": "${item.topico}",
    "ramos": [
      {
        "titulo": "nome do ramo",
        "cor": "#818CF8",
        "filhos": ["conceito 1", "conceito 2", "conceito 3"]
      }
    ]
  },
  "dicas": [
    "Dica prática 1 pra não errar no ENEM",
    "Dica prática 2",
    "Dica prática 3",
    "Dica prática 4"
  ],
  "questoes_exemplo": [
    {
      "enunciado": "Enunciado de exemplo do estilo ENEM sobre ${item.topico}",
      "alternativas": [
        {"letra": "A", "texto": "alternativa A"},
        {"letra": "B", "texto": "alternativa B"},
        {"letra": "C", "texto": "alternativa C"},
        {"letra": "D", "texto": "alternativa D"},
        {"letra": "E", "texto": "alternativa E"}
      ],
      "resposta_correta": "C",
      "explicacao": "Explicação da resposta correta"
    }
  ]
}`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 2000,
    temperature: 0.5,
  })

  const text = completion.choices[0].message.content || ''
  try {
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    await supabase.from('repositorio').insert({
      area: item.area,
      topico: item.topico,
      subtopico: null,
      slug,
      resumo: parsed.resumo,
      mapa_mental: parsed.mapa_mental,
      dicas: parsed.dicas,
      questoes_exemplo: parsed.questoes_exemplo,
    })

    return NextResponse.json({ sucesso: true, slug, topico: item.topico, proximo: idx + 1, total: CONTEUDO_ENEM.length })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message, idx, proximo: idx + 1 }, { status: 500 })
  }
}
