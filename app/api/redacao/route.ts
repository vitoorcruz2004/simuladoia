import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const EXEMPLOS_NOTA_1000 = `
EXEMPLO 1 — Nota 1000 ENEM 2024 (Tema: Desafios para a valorização da herança africana no Brasil)
Autora: Amanda Chagas

"A obra 'Torto Arado', de Itamar Vieira Junior, conta as vivências das irmãs Bibiana e Belonísia, com ênfase na forte relação cultural e religiosa que estabelecem com a ancestralidade africana. Fora da ficção, apesar do enaltecimento promovido pelo autor, as heranças afrodescendentes sofrem com a desvalorização constante no Brasil. Nesse contexto, o passado colonial e a cultura eurocêntrica configuram desafios que fundamentam esse grave panorama.

Em primeira análise, convém ressaltar que a escassa valorização de tais tradições se arquiteta como expressão de contribuições históricas. De fato, a escravização de povos oriundos da África, no Brasil Colônia, constitui a base para a formação do país. Nessa conjuntura, esses indivíduos foram vítimas de violências físicas e simbólicas que, de forma cruel, visavam à docilização e ao apagamento da identidade desses grupos. Desse modo, a marginalização da população negra nesse período, promovida pela elite branca, implicou, consequentemente, a invisibilização dessa minoria até a atualidade, visto que o Estado falhou na inserção social e na valorização do legado africano após a abolição da escravidão.

Ademais, uma segunda análise acerca da problemática revela a influência da hipervalorização da cultura branca. Sob a perspectiva de George Orwell, a mídia é capaz de mover a massa - inclusive no que tange às preferências culturais. Nessa lógica, a hegemonia europeia - de caráter secular - nas produções artísticas brasileiras, somada à inferiorização de elementos de matriz africana, culminou na instituição de uma cosmovisão popular voltada para a descredibilização das heranças invisibilizadas. Com efeito, a exposição midiática insuficiente culmina na subvalorização dessas tradições. Logo, essa realidade degradante precisa ser desconstruída.

Portanto, torna-se evidente o impacto de questões históricas e culturais na manutenção do impasse sociocultural. Para combater esses desafios, a mídia deve promover a valorização das culturas africanas herdadas, por meio da criação de filmes, documentários e novelas que as exponham, a fim de mitigar a perpetuação da desvalorização histórica e de problematizar o passado colonial."

O QUE ESSA REDAÇÃO FEZ CERTO:
- Competência 1: Norma culta perfeita, variação sintática, pontuação correta
- Competência 2: Tema central mantido do início ao fim, repertório sociocultural (Torto Arado, George Orwell)
- Competência 3: Estrutura clara — introdução com tese, 2 parágrafos de desenvolvimento com argumento central + exemplificação, conclusão
- Competência 4: Conectivos variados ("Em primeira análise", "Ademais", "Nessa conjuntura", "Com efeito", "Portanto")
- Competência 5: Proposta com AGENTE (mídia), AÇÃO (criar filmes/documentários), MEIO (exposição midiática), EFEITO (mitigar desvalorização histórica)

EXEMPLO 2 — Nota 1000 ENEM 2024
Autora: Anna Beatriz Veríssimo

[Proposta de intervenção exemplar]:
"Portanto, é preciso reconhecer e valorizar a herança africana no Brasil. Para isso, o Governo Federal, em parceria com as secretarias estaduais de educação, deve ampliar as campanhas de valorização da cultura africana, sob um viés afrocentrado, por meio de votação entre deputados e senadores — responsáveis pela aprovação da Lei Orçamentária Anual (LOA) —, com a finalidade de combater a visão eurocêntrica presente na sociedade. Ainda, cabe ao Ministério da Educação fomentar palestras socioeducativas, ministradas por pedagogos negros, nas instituições escolares, a fim de disseminar o conhecimento acerca do inestimável legado africano."

O QUE ESSA PROPOSTA FEZ CERTO:
- Agente 1: Governo Federal + secretarias estaduais
- Ação 1: Ampliar campanhas de valorização
- Meio: votação parlamentar (LOA)
- Efeito: combater visão eurocêntrica
- Agente 2: Ministério da Educação
- Ação 2: Fomentar palestras socioeducativas
- Detalhamento: palestras ministradas por pedagogos negros
`

const CRITERIOS_DETALHADOS = `
CRITÉRIOS DE CORREÇÃO OFICIAIS DO ENEM (Matriz de Referência INEP):

COMPETÊNCIA 1 — Domínio da norma culta (0-200):
- 200: Excelente domínio, desvios mínimos e acidentais
- 160: Bom domínio, poucos desvios
- 120: Domínio mediano, alguns desvios
- 80: Domínio insuficiente, muitos desvios
- 40: Domínio precário, graves e frequentes desvios
- 0: Desconhece a norma culta

COMPETÊNCIA 2 — Compreensão do tema (0-200):
- 200: Desenvolve o tema com excelência, repertório sociocultural produtivo e pertinente
- 160: Desenvolve o tema, bom repertório
- 120: Desenvolve o tema, mas tangencia em partes
- 80: Desenvolve tangencialmente
- 40: Tangencia o tema
- 0: Foge ao tema ou não atende ao tipo textual

COMPETÊNCIA 3 — Seleção e organização das informações (0-200):
- 200: Apresenta informações, fatos e opiniões relacionados ao tema de forma consistente e organizada em defesa de um ponto de vista
- 160: Apresenta argumentação bem estruturada
- 120: Argumentação suficiente mas pouco aprofundada
- 80: Apresenta argumentação mediana
- 40: Argumentação fraca e desorganizada
- 0: Sem argumentação

COMPETÊNCIA 4 — Coesão e coerência (0-200):
- 200: Articula bem as partes do texto, repertório diversificado de recursos coesivos
- 160: Articula as partes com poucas inadequações
- 120: Articula de forma mediana
- 80: Apresenta inadequações frequentes
- 40: Apresenta muitas inadequações que prejudicam a compreensão
- 0: Não articula as partes

COMPETÊNCIA 5 — Proposta de intervenção (0-200):
Para nota máxima (200), a proposta DEVE conter os 5 elementos:
1. AGENTE — quem vai executar (ex: Governo Federal, Ministério da Educação, mídia)
2. AÇÃO — o que será feito (ex: criar programas, fomentar campanhas)
3. MEIO/MODO — como será feito (ex: por meio de legislação, através de parcerias)
4. EFEITO/FINALIDADE — para quê (ex: a fim de reduzir, com o objetivo de combater)
5. DETALHAMENTO — aprofundamento de um dos elementos anteriores

CAUSA DE NOTA ZERO: fuga ao tema, cópia dos textos motivadores, texto com menos de 7 linhas, estrutura que não seja dissertativo-argumentativa, ofensa aos direitos humanos.
`

export async function POST(req: NextRequest) {
  const { tema, texto } = await req.json()

  const palavras = texto.trim().split(/\s+/).length

  const prompt = `Você é um corretor especialista em redações do ENEM com 15 anos de experiência nas bancas do INEP. Você conhece profundamente a Matriz de Referência e já corrigiu milhares de redações.

TEMA DA REDAÇÃO: ${tema}

REDAÇÃO DO CANDIDATO:
${texto}

NÚMERO DE PALAVRAS: ${palavras}

---

CONTEXTO — CRITÉRIOS OFICIAIS DO INEP:
${CRITERIOS_DETALHADOS}

---

REFERÊNCIA — EXEMPLOS DE REDAÇÕES NOTA 1000 DO ENEM 2024 PARA COMPARAÇÃO:
${EXEMPLOS_NOTA_1000}

---

INSTRUÇÕES:
- Corrija com rigor e precisão, exatamente como o INEP faz
- Compare com os exemplos nota 1000 acima para calibrar sua nota
- Seja específico no feedback — cite trechos do texto do candidato quando necessário
- Na proposta de intervenção, verifique EXPLICITAMENTE cada um dos 5 elementos (agente, ação, meio, efeito, detalhamento)
- Se o texto tiver menos de 7 linhas ou fugir ao tema, aplique nota zero nas competências afetadas

Retorne APENAS um JSON válido com este formato exato, sem markdown:
{
  "nota_total": número de 0 a 1000,
  "competencias": [
    {
      "numero": 1,
      "nome": "Domínio da norma culta",
      "nota": número de 0 a 200 (múltiplo de 40),
      "nivel": "Insuficiente|Precário|Mediano|Bom|Excelente",
      "feedback": "feedback específico citando trechos do texto quando possível. Mínimo 2 frases.",
      "exemplos_erros": ["erro específico 1", "erro específico 2"] ou []
    },
    {
      "numero": 2,
      "nome": "Compreensão do tema e tipo textual",
      "nota": número de 0 a 200 (múltiplo de 40),
      "nivel": "Insuficiente|Precário|Mediano|Bom|Excelente",
      "feedback": "feedback específico sobre aderência ao tema e repertório sociocultural usado",
      "repertorio_usado": "lista do repertório sociocultural identificado ou 'Nenhum identificado'"
    },
    {
      "numero": 3,
      "nome": "Seleção e organização das informações",
      "nota": número de 0 a 200 (múltiplo de 40),
      "nivel": "Insuficiente|Precário|Mediano|Bom|Excelente",
      "feedback": "feedback sobre estrutura, argumentação e desenvolvimento"
    },
    {
      "numero": 4,
      "nome": "Coesão e coerência",
      "nota": número de 0 a 200 (múltiplo de 40),
      "nivel": "Insuficiente|Precário|Mediano|Bom|Excelente",
      "feedback": "feedback sobre conectivos, progressão textual e articulação",
      "conectivos_usados": "conectivos identificados ou 'Poucos/nenhum'"
    },
    {
      "numero": 5,
      "nome": "Proposta de intervenção",
      "nota": número de 0 a 200 (múltiplo de 40),
      "nivel": "Insuficiente|Precário|Mediano|Bom|Excelente",
      "feedback": "feedback detalhado sobre a proposta",
      "elementos": {
        "agente": "agente identificado ou 'Ausente'",
        "acao": "ação identificada ou 'Ausente'",
        "meio": "meio identificado ou 'Ausente'",
        "efeito": "efeito identificado ou 'Ausente'",
        "detalhamento": "detalhamento identificado ou 'Ausente'"
      }
    }
  ],
  "pontos_fortes": ["ponto forte específico 1", "ponto forte específico 2"],
  "pontos_melhora": ["melhoria específica 1", "melhoria específica 2", "melhoria específica 3"],
  "comentario_geral": "comentário de 3-4 frases comparando com o padrão nota 1000 e indicando o principal caminho para evolução",
  "nota_estimada_real": "estimativa de nota se fosse uma prova real do ENEM considerando 2 corretores"
}`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 2000,
    temperature: 0.2,
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
