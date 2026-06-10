'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { atualizarGamificacao, registrarQuestaoErrada } from '@/lib/gamificacao'
import { useRouter } from 'next/navigation'

interface Questao {
  id: string
  area: string
  subarea: string
  enunciado: string
  alternativas: { letra: string; texto: string }[]
  resposta_correta: string
  explicacao: string
}

interface Resultado {
  area: string
  total: number
  acertos: number
}

const AREAS = ['Matemática', 'Linguagens', 'Ciências Humanas', 'Ciências da Natureza']

export default function Simulado() {
  const [user, setUser] = useState<any>(null)
  const [questoes, setQuestoes] = useState<Questao[]>([])
  const [atual, setAtual] = useState(0)
  const [respostaSelecionada, setRespostaSelecionada] = useState<string | null>(null)
  const [respondida, setRespondida] = useState(false)
  const [respostas, setRespostas] = useState<{questao_id: string; correta: boolean; area: string; subarea: string}[]>([])
  const [simuladoId, setSimuladoId] = useState<string | null>(null)
  const [fase, setFase] = useState<'loading' | 'simulando' | 'resultado'>('loading')
  const [resultado, setResultado] = useState<Resultado[]>([])
  const [inicio, setInicio] = useState<Date>(new Date())
  const router = useRouter()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      setUser(user)
      await carregarQuestoes(user.id)
    }
    init()
  }, [])

  async function carregarQuestoes(userId: string) {
    // pega desempenho atual pra priorizar gaps
    const { data: desemp } = await supabase
      .from('desempenho')
      .select('*')
      .eq('user_id', userId)
      .order('percentual')

    // distribui 10 questões priorizando áreas com menor desempenho
    let todasQuestoes: Questao[] = []

    if (desemp && desemp.length > 0) {
      // usuário já tem histórico — prioriza gap
      const pior = desemp.slice(0, 2).map((d: any) => d.area)
      
      for (const area of pior) {
        const { data } = await supabase
          .from('questoes')
          .select('*')
          .eq('area', area)
          .limit(3)
        if (data) todasQuestoes.push(...data)
      }
      
      // completa com outras áreas
      const outras = AREAS.filter(a => !pior.includes(a))
      for (const area of outras) {
        const { data } = await supabase
          .from('questoes')
          .select('*')
          .eq('area', area)
          .limit(2)
        if (data) todasQuestoes.push(...data)
      }
    } else {
      // primeiro simulado — pega de todas as áreas
      for (const area of AREAS) {
        const { data } = await supabase
          .from('questoes')
          .select('*')
          .eq('area', area)
          .limit(3)
        if (data) todasQuestoes.push(...data)
      }
    }

    // embaralha
    todasQuestoes = todasQuestoes.sort(() => Math.random() - 0.5).slice(0, 10)

    // cria simulado no banco
    const { data: sim } = await supabase
      .from('simulados')
      .insert({ user_id: userId, total_questoes: todasQuestoes.length })
      .select()
      .single()

    if (sim) setSimuladoId(sim.id)
    setQuestoes(todasQuestoes)
    setInicio(new Date())
    setFase('simulando')
  }

  function selecionar(letra: string) {
    if (respondida) return
    setRespostaSelecionada(letra)
  }

  async function confirmar() {
    if (!respostaSelecionada || respondida) return
    setRespondida(true)

    const q = questoes[atual]
    const correta = respostaSelecionada === q.resposta_correta
    const tempo = Math.round((new Date().getTime() - inicio.getTime()) / 1000)

    const novaResposta = {
      questao_id: q.id,
      correta,
      area: q.area,
      subarea: q.subarea,
    }
    setRespostas(prev => [...prev, novaResposta])

    // salva no banco
    if (simuladoId && user) {
      await supabase.from('respostas').insert({
        simulado_id: simuladoId,
        user_id: user.id,
        questao_id: q.id,
        resposta_dada: respostaSelecionada,
        correta,
        tempo_segundos: tempo,
      })
    }

    setInicio(new Date())
  }

  async function proxima() {
    if (atual < questoes.length - 1) {
      setAtual(prev => prev + 1)
      setRespostaSelecionada(null)
      setRespondida(false)
    } else {
      await finalizar()
    }
  }

  async function finalizar() {
    const todasRespostas = [...respostas]
    const acertos = todasRespostas.filter(r => r.correta).length
    const percentual = Math.round((acertos / todasRespostas.length) * 100)

    // calcula resultado por área
    const porArea: Record<string, { total: number; acertos: number }> = {}
    for (const r of todasRespostas) {
      if (!porArea[r.area]) porArea[r.area] = { total: 0, acertos: 0 }
      porArea[r.area].total++
      if (r.correta) porArea[r.area].acertos++
    }
    const resultadoFinal = Object.entries(porArea).map(([area, v]) => ({ area, ...v }))
    setResultado(resultadoFinal)

    // atualiza simulado
    if (simuladoId) {
      await supabase.from('simulados').update({
        status: 'finalizado',
        acertos,
        percentual,
        finalizado_at: new Date().toISOString(),
      }).eq('id', simuladoId)
    }

    // atualiza desempenho por área
    if (user) {
      for (const r of resultadoFinal) {
        const { data: existing } = await supabase
          .from('desempenho')
          .select('*')
          .eq('user_id', user.id)
          .eq('area', r.area)
          .is('subarea', null)
          .single()

        if (existing) {
          const novoTotal = existing.total_respondidas + r.total
          const novosAcertos = existing.total_acertos + r.acertos
          await supabase.from('desempenho').update({
            total_respondidas: novoTotal,
            total_acertos: novosAcertos,
            percentual: Math.round((novosAcertos / novoTotal) * 100),
            updated_at: new Date().toISOString(),
          }).eq('id', existing.id)
        } else {
          await supabase.from('desempenho').insert({
            user_id: user.id,
            area: r.area,
            total_respondidas: r.total,
            total_acertos: r.acertos,
            percentual: Math.round((r.acertos / r.total) * 100),
          })
        }
      }
    }

    setFase('resultado')

    // gamificação
    if (user) {
      const bonus = Math.round((acertos / todasRespostas.length) * 20)
      await atualizarGamificacao(user.id, 'simulado', bonus)

      // registra questões erradas
      const erradas = todasRespostas.filter(r => !r.correta)
      for (const e of erradas) {
        await registrarQuestaoErrada(user.id, e.questao_id)
      }
    }
  }

  // LOADING
  if (fase === 'loading') return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'#09090B'}}>
      <div className="text-center">
        <div className="text-zinc-400 text-sm mb-2">Montando seu simulado personalizado...</div>
        <div className="text-xs text-zinc-600">Analisando seu histórico e identificando gaps</div>
      </div>
    </div>
  )

  // RESULTADO
  if (fase === 'resultado') {
    const acertos = respostas.filter(r => r.correta).length
    const percentual = Math.round((acertos / questoes.length) * 100)
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{background:'#09090B'}}>
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <div className="text-5xl font-extrabold tracking-tight mb-2"
              style={{color: percentual >= 70 ? '#22d3a0' : percentual >= 50 ? '#f59e0b' : '#f87171'}}>
              {percentual}%
            </div>
            <div className="text-zinc-400 text-sm">{acertos} de {questoes.length} acertos</div>
          </div>

          <div className="rounded-xl border border-zinc-800 p-6 mb-6" style={{background:'#111113'}}>
            <h3 className="text-sm font-semibold text-zinc-300 mb-4">Resultado por área</h3>
            {resultado.map(r => (
              <div key={r.area} className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-zinc-300">{r.area}</span>
                  <span className="font-bold" style={{color: (r.acertos/r.total) >= 0.7 ? '#22d3a0' : '#f87171'}}>
                    {r.acertos}/{r.total}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div className="h-full rounded-full" style={{
                    width:`${Math.round((r.acertos/r.total)*100)}%`,
                    background: (r.acertos/r.total) >= 0.7 ? '#22d3a0' : '#f87171'
                  }}/>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={() => router.push('/dashboard')}
              className="flex-1 py-3 rounded-xl text-sm font-semibold border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-all">
              Ver painel
            </button>
            <button onClick={() => { setFase('loading'); setAtual(0); setRespostas([]); setRespostaSelecionada(null); setRespondida(false); carregarQuestoes(user.id) }}
              className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
              style={{background:'#6366F1', color:'#fff'}}>
              Novo simulado →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // SIMULADO
  const q = questoes[atual]
  const progresso = Math.round(((atual) / questoes.length) * 100)

  return (
    <div className="min-h-screen" style={{background:'#09090B'}}>
      {/* BARRA DE PROGRESSO */}
      <div className="h-1 bg-zinc-800">
        <div className="h-full transition-all duration-500" style={{width:`${progresso}%`, background:'#6366F1'}}/>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-8">
          <div className="text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full border"
            style={{color:'#818CF8', borderColor:'#6366F126', background:'#6366F10d'}}>
            {q.area}
          </div>
          <div className="text-sm text-zinc-500">{atual + 1} / {questoes.length}</div>
        </div>

        {/* QUESTÃO */}
        <div className="rounded-xl border border-zinc-800 p-6 mb-6" style={{background:'#111113'}}>
          <p className="text-sm text-zinc-500 mb-4 uppercase tracking-widest font-medium">{q.subarea}</p>
          <p className="text-base leading-relaxed text-zinc-100">{q.enunciado}</p>
        </div>

        {/* ALTERNATIVAS */}
        <div className="flex flex-col gap-3 mb-6">
          {q.alternativas.map(alt => {
            let estilo: React.CSSProperties = {
              background: '#111113',
              border: '1px solid #27272A',
              color: '#A1A1AA',
            }

            if (respostaSelecionada === alt.letra && !respondida) {
              estilo = { background: '#6366F10d', border: '1px solid #6366F1', color: '#FAFAFA' }
            }

            if (respondida) {
              if (alt.letra === q.resposta_correta) {
                estilo = { background: 'rgba(34,211,160,0.08)', border: '1px solid rgba(34,211,160,0.4)', color: '#22d3a0' }
              } else if (alt.letra === respostaSelecionada) {
                estilo = { background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.4)', color: '#f87171' }
              }
            }

            return (
              <button
                key={alt.letra}
                onClick={() => selecionar(alt.letra)}
                className="w-full text-left px-4 py-3 rounded-xl flex items-start gap-3 transition-all text-sm"
                style={estilo}
              >
                <span className="font-bold min-w-[20px] mt-0.5" style={{opacity: 0.5}}>{alt.letra}</span>
                <span className="leading-relaxed">{alt.texto}</span>
              </button>
            )
          })}
        </div>

        {/* EXPLICAÇÃO */}
        {respondida && (
          <div className="rounded-xl p-4 mb-6 text-sm leading-relaxed"
            style={{background: respostaSelecionada === q.resposta_correta ? 'rgba(34,211,160,0.06)' : 'rgba(248,113,113,0.06)',
              border: `1px solid ${respostaSelecionada === q.resposta_correta ? 'rgba(34,211,160,0.2)' : 'rgba(248,113,113,0.2)'}`,
              color: '#A1A1AA'}}>
            <span className="font-semibold text-zinc-200">Explicação: </span>{q.explicacao}
          </div>
        )}

        {/* BOTÕES */}
        {!respondida ? (
          <button
            onClick={confirmar}
            disabled={!respostaSelecionada}
            className="w-full py-4 rounded-xl font-bold text-sm transition-all"
            style={{
              background: respostaSelecionada ? '#6366F1' : '#18181B',
              color: respostaSelecionada ? '#fff' : '#52525B',
              cursor: respostaSelecionada ? 'pointer' : 'not-allowed'
            }}>
            Confirmar resposta
          </button>
        ) : (
          <button
            onClick={proxima}
            className="w-full py-4 rounded-xl font-bold text-sm transition-all hover:opacity-90"
            style={{background:'#6366F1', color:'#fff'}}>
            {atual < questoes.length - 1 ? 'Próxima questão →' : 'Ver resultado →'}
          </button>
        )}
      </div>
    </div>
  )
}
