'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { atualizarGamificacao, registrarQuestaoErrada } from '@/lib/gamificacao'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Questao {
  id: string; area: string; subarea: string; enunciado: string
  contexto: string | null; alternativas: { letra: string; texto: string }[]
  resposta_correta: string; explicacao: string | null; fonte: string | null; ano: number | null
}

const AREAS_CONFIG = [
  { area: 'Matemática', icon: '📐', cor: '#818CF8',
    topicos: ['Funções','Geometria Plana','Geometria Espacial','Probabilidade','Estatística','Progressões','Logaritmo','Trigonometria','Matrizes e Determinantes','Equações'] },
  { area: 'Linguagens', icon: '📝', cor: '#34D399',
    topicos: ['Interpretação de Texto','Literatura Brasileira','Gramática','Figuras de Linguagem','Redação','Variação Linguística','Artes','Educação Física'] },
  { area: 'Ciências Humanas', icon: '🌍', cor: '#FBBF24',
    topicos: ['História do Brasil','História Geral','Geografia do Brasil','Geografia Mundial','Filosofia','Sociologia','Atualidades'] },
  { area: 'Ciências da Natureza', icon: '🔬', cor: '#60A5FA',
    topicos: ['Biologia','Química','Física','Ecologia','Genética','Termodinâmica','Eletricidade','Ondulatória'] },
]

const MODOS = [
  {
    id: 'enem',
    icon: '📋',
    titulo: 'Simulado ENEM',
    descricao: 'Formato real do ENEM — todas as áreas, questões mistas',
    cor: '#6366F1',
    tag: 'Recomendado',
  },
  {
    id: 'topico',
    icon: '🎯',
    titulo: 'Por área ou tópico',
    descricao: 'Escolha a matéria e o subtópico específico que acabou de estudar',
    cor: '#34D399',
    tag: null,
  },
  {
    id: 'plano',
    icon: '📅',
    titulo: 'Baseado no plano',
    descricao: 'O sistema monta com base no que seu plano de estudos indica para essa semana',
    cor: '#FBBF24',
    tag: null,
  },
]

function parseContexto(texto: string) {
  if (!texto) return null
  const partes = texto.split(/(!\[.*?\]\(.*?\))/g)
  return partes.map((parte, i) => {
    const imgMatch = parte.match(/!\[.*?\]\((.*?)\)/)
    if (imgMatch) {
      const url = imgMatch[1]
      if (url.includes('broken-image') || url.includes('svg')) return null
      return (
        <div key={i} style={{ margin: '12px 0', textAlign: 'center' }}>
          <img src={url} alt="Imagem da questão"
            style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        </div>
      )
    }
    if (!parte.trim()) return null
    const withBold = parte.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    return <span key={i} style={{ whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: withBold }} />
  }).filter(Boolean)
}

export default function Simulado() {
  const [user, setUser] = useState<any>(null)
  const [fase, setFase] = useState<'menu' | 'config' | 'loading' | 'simulando' | 'resultado'>('menu')
  const [modoSelecionado, setModoSelecionado] = useState('')
  const [areaSelecionada, setAreaSelecionada] = useState('')
  const [topicoSelecionado, setTopicoSelecionado] = useState('')
  const [areasMistas, setAreasMistas] = useState<string[]>([])
  const [qtdQuestoes, setQtdQuestoes] = useState(10)
  const [modoCronometro, setModoCronometro] = useState(false)
  const [questoes, setQuestoes] = useState<Questao[]>([])
  const [atual, setAtual] = useState(0)
  const [respostaSelecionada, setRespostaSelecionada] = useState<string | null>(null)
  const [respondida, setRespondida] = useState(false)
  const [respostas, setRespostas] = useState<{ questao_id: string; correta: boolean; area: string }[]>([])
  const [simuladoId, setSimuladoId] = useState<string | null>(null)
  const [resultado, setResultado] = useState<{ area: string; total: number; acertos: number }[]>([])
  const [tempoTotal, setTempoTotal] = useState(0)
  const [tempoRestante, setTempoRestante] = useState(0)
  const [mostrarContexto, setMostrarContexto] = useState(true)
  const [planoSemana, setPlanoSemana] = useState<any>(null)
  const timerRef = useRef<any>(null)
  const inicioRef = useRef<Date>(new Date())
  const router = useRouter()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      setUser(user)
    }
    init()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  useEffect(() => {
    if (fase === 'simulando' && modoCronometro && tempoRestante > 0) {
      timerRef.current = setInterval(() => {
        setTempoRestante(t => {
          if (t <= 1) { clearInterval(timerRef.current); finalizar(); return 0 }
          return t - 1
        })
      }, 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [fase, modoCronometro])

  function formatTempo(s: number) {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  }

  async function iniciarSimulado(areas: string[], topico?: string) {
    setFase('loading')
    let todasQuestoes: Questao[] = []
    const qtdPorArea = Math.ceil(qtdQuestoes / areas.length)

    for (const area of areas) {
      let query = supabase.from('questoes').select('*').eq('area', area)
      if (topico) query = query.ilike('subarea', `%${topico}%`)
      const { data } = await query.order('created_at', { ascending: false }).limit(qtdPorArea + 10)
      if (data) todasQuestoes.push(...data)
    }

    // Se não achou por subarea, pega da área mesmo
    if (todasQuestoes.length < 3 && topico) {
      for (const area of areas) {
        const { data } = await supabase.from('questoes').select('*').eq('area', area)
          .order('created_at', { ascending: false }).limit(qtdPorArea + 10)
        if (data) todasQuestoes.push(...data)
      }
    }

    todasQuestoes = todasQuestoes.sort(() => Math.random() - 0.5).slice(0, qtdQuestoes)

    const { data: sim } = await supabase.from('simulados')
      .insert({ user_id: user.id, total_questoes: todasQuestoes.length }).select().single()
    if (sim) setSimuladoId(sim.id)

    if (modoCronometro) {
      const tempo = qtdQuestoes * 3 * 60
      setTempoTotal(tempo); setTempoRestante(tempo)
    }

    setQuestoes(todasQuestoes)
    setAtual(0); setRespostaSelecionada(null); setRespondida(false)
    setRespostas([]); setMostrarContexto(true)
    inicioRef.current = new Date()
    setFase('simulando')
  }

  async function confirmar() {
    if (!respostaSelecionada || respondida) return
    setRespondida(true)
    const q = questoes[atual]
    const correta = respostaSelecionada === q.resposta_correta
    const tempo = Math.round((new Date().getTime() - inicioRef.current.getTime()) / 1000)
    setRespostas(prev => [...prev, { questao_id: q.id, correta, area: q.area }])
    if (simuladoId && user) {
      await supabase.from('respostas').insert({
        simulado_id: simuladoId, user_id: user.id, questao_id: q.id,
        resposta_dada: respostaSelecionada, correta, tempo_segundos: tempo,
      })
    }
    if (!correta && user) await registrarQuestaoErrada(user.id, q.id)
    inicioRef.current = new Date()
  }

  async function proxima() {
    if (atual < questoes.length - 1) {
      setAtual(a => a + 1); setRespostaSelecionada(null)
      setRespondida(false); setMostrarContexto(true)
    } else { await finalizar() }
  }

  async function finalizar() {
    if (timerRef.current) clearInterval(timerRef.current)
    const todas = [...respostas]
    const acertos = todas.filter(r => r.correta).length
    const percentual = Math.round((acertos / Math.max(todas.length, 1)) * 100)
    const porArea: Record<string, { total: number; acertos: number }> = {}
    for (const r of todas) {
      if (!porArea[r.area]) porArea[r.area] = { total: 0, acertos: 0 }
      porArea[r.area].total++
      if (r.correta) porArea[r.area].acertos++
    }
    setResultado(Object.entries(porArea).map(([area, v]) => ({ area, ...v })))
    if (simuladoId) {
      await supabase.from('simulados').update({
        status: 'finalizado', acertos, percentual, finalizado_at: new Date().toISOString(),
      }).eq('id', simuladoId)
    }
    if (user) {
      for (const [area, v] of Object.entries(porArea)) {
        const { data: ex } = await supabase.from('desempenho').select('*')
          .eq('user_id', user.id).eq('area', area).is('subarea', null).single()
        if (ex) {
          const novoTotal = ex.total_respondidas + v.total
          const novosAcertos = ex.total_acertos + v.acertos
          await supabase.from('desempenho').update({
            total_respondidas: novoTotal, total_acertos: novosAcertos,
            percentual: Math.round((novosAcertos / novoTotal) * 100),
          }).eq('id', ex.id)
        } else {
          await supabase.from('desempenho').insert({
            user_id: user.id, area, total_respondidas: v.total, total_acertos: v.acertos,
            percentual: Math.round((v.acertos / v.total) * 100),
          })
        }
      }
      await atualizarGamificacao(user.id, 'simulado', Math.round((acertos / Math.max(todas.length, 1)) * 20), todas.length)
    }
    setFase('resultado')
  }

  const bg = '#07070d'
  const card: React.CSSProperties = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16 }
  const cor = (n: number) => n >= 70 ? '#34D399' : n >= 50 ? '#FBBF24' : '#F87171'

  const Nav = () => (
    <div style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(7,7,13,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 16px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontWeight: 800, fontSize: '1rem', color: '#FAFAFA' }}>Simulado<span style={{ color: '#818CF8' }}>IA</span></span>
      <Link href="/dashboard"><span style={{ fontSize: '0.78rem', color: '#52525B' }}>← Voltar</span></Link>
    </div>
  )

  // ── MENU DE MODOS ──
  if (fase === 'menu') return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: 'Plus Jakarta Sans,sans-serif' }}>
      <style>{`*{box-sizing:border-box} .tap{-webkit-tap-highlight-color:transparent;cursor:pointer;transition:all .15s} .tap:active{opacity:.7;transform:scale(.97)} a{text-decoration:none;color:inherit}`}</style>
      <Nav />
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 16px 80px' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#FAFAFA' }}>🚀 Que tipo de simulado?</h1>
          <p style={{ color: '#52525B', fontSize: '0.8rem', marginTop: 4 }}>Escolha o modo que melhor se encaixa no seu objetivo agora.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          {MODOS.map(m => (
            <button key={m.id} onClick={() => { setModoSelecionado(m.id); setFase('config') }} className="tap"
              style={{ width: '100%', textAlign: 'left', padding: '18px 20px', borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, borderRadius: '16px 0 0 16px', background: m.cor }} />
              <div style={{ paddingLeft: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: '1.5rem' }}>{m.icon}</span>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: '#FAFAFA' }}>{m.titulo}</span>
                  {m.tag && (
                    <span style={{ fontSize: '0.6rem', padding: '2px 8px', borderRadius: 100, background: `${m.cor}22`, color: m.cor, border: `1px solid ${m.cor}44`, fontWeight: 700 }}>
                      {m.tag}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '0.8rem', color: '#71717A', margin: 0, lineHeight: 1.5 }}>{m.descricao}</p>
              </div>
              <div style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', color: '#3F3F46', fontSize: '1rem' }}>→</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  // ── CONFIG POR MODO ──
  if (fase === 'config') {
    const areaAtual = AREAS_CONFIG.find(a => a.area === areaSelecionada)

    return (
      <div style={{ minHeight: '100vh', background: bg, fontFamily: 'Plus Jakarta Sans,sans-serif' }}>
        <style>{`*{box-sizing:border-box} .tap{-webkit-tap-highlight-color:transparent;cursor:pointer;transition:all .15s} .tap:active{opacity:.7;transform:scale(.97)} a{text-decoration:none;color:inherit}`}</style>
        <div style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(7,7,13,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 16px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 800, fontSize: '1rem', color: '#FAFAFA' }}>Simulado<span style={{ color: '#818CF8' }}>IA</span></span>
          <button onClick={() => { setFase('menu'); setAreaSelecionada(''); setTopicoSelecionado(''); setAreasMistas([]) }}
            style={{ fontSize: '0.78rem', color: '#52525B', background: 'none', border: 'none', cursor: 'pointer' }}>← Voltar</button>
        </div>

        <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 16px 80px' }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FAFAFA' }}>
              {modoSelecionado === 'enem' ? '📋 Simulado ENEM' : modoSelecionado === 'topico' ? '🎯 Por área e tópico' : '📅 Baseado no plano'}
            </h1>
          </div>

          {/* MODO ENEM */}
          {modoSelecionado === 'enem' && (
            <>
              <div style={{ ...card, padding: '18px 20px', marginBottom: 14 }}>
                <div style={{ fontSize: '0.62rem', color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 14 }}>
                  Áreas incluídas {areasMistas.length === 0 ? '(todas)' : `(${areasMistas.length})`}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {AREAS_CONFIG.map(a => {
                    const ativo = areasMistas.includes(a.area)
                    return (
                      <button key={a.area} onClick={() => setAreasMistas(prev => ativo ? prev.filter(x => x !== a.area) : [...prev, a.area])} className="tap"
                        style={{ padding: '10px 12px', borderRadius: 12, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, background: ativo ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${ativo ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.07)'}`, cursor: 'pointer' }}>
                        <span>{a.icon}</span>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: ativo ? '#818CF8' : '#A1A1AA' }}>{a.area.split(' ')[0]}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div style={{ ...card, padding: '16px 20px', marginBottom: 14 }}>
                <div style={{ fontSize: '0.62rem', color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 12 }}>Questões</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[10, 20, 30, 45, 90].map(n => (
                    <button key={n} onClick={() => setQtdQuestoes(n)} className="tap"
                      style={{ padding: '7px 14px', borderRadius: 9, fontWeight: 700, fontSize: '0.85rem', background: qtdQuestoes === n ? '#6366F1' : 'rgba(255,255,255,0.04)', color: qtdQuestoes === n ? '#fff' : '#71717A', border: `1px solid ${qtdQuestoes === n ? '#6366F1' : 'rgba(255,255,255,0.08)'}`, cursor: 'pointer' }}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ ...card, padding: '14px 20px', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#E4E4E7' }}>⏱️ Cronômetro</div>
                    <div style={{ fontSize: '0.65rem', color: '#52525B', marginTop: 2 }}>{modoCronometro ? formatTempo(qtdQuestoes * 3 * 60) : 'Sem limite'}</div>
                  </div>
                  <button onClick={() => setModoCronometro(!modoCronometro)} className="tap"
                    style={{ width: 44, height: 24, borderRadius: 100, border: 'none', cursor: 'pointer', position: 'relative', background: modoCronometro ? '#6366F1' : 'rgba(255,255,255,0.1)' }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, transition: 'all .3s', left: modoCronometro ? 23 : 3 }} />
                  </button>
                </div>
              </div>
              <button onClick={() => iniciarSimulado(areasMistas.length > 0 ? areasMistas : AREAS_CONFIG.map(a => a.area))} className="tap"
                style={{ width: '100%', padding: '16px', borderRadius: 15, fontWeight: 800, fontSize: '0.95rem', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#6366F1,#818CF8)', color: '#fff', boxShadow: '0 6px 20px rgba(99,102,241,0.3)' }}>
                Começar →
              </button>
            </>
          )}

          {/* MODO TÓPICO */}
          {modoSelecionado === 'topico' && (
            <>
              {!areaSelecionada ? (
                <>
                  <p style={{ fontSize: '0.82rem', color: '#71717A', marginBottom: 16 }}>Primeiro, escolha a matéria:</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                    {AREAS_CONFIG.map(a => (
                      <button key={a.area} onClick={() => setAreaSelecionada(a.area)} className="tap"
                        style={{ width: '100%', padding: '16px 20px', borderRadius: 14, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer' }}>
                        <span style={{ fontSize: '1.8rem' }}>{a.icon}</span>
                        <div>
                          <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#FAFAFA' }}>{a.area}</div>
                          <div style={{ fontSize: '0.68rem', color: '#52525B', marginTop: 2 }}>{a.topicos.length} tópicos disponíveis</div>
                        </div>
                        <span style={{ marginLeft: 'auto', color: '#3F3F46' }}>→</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : !topicoSelecionado ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <button onClick={() => setAreaSelecionada('')} style={{ fontSize: '0.75rem', color: '#52525B', background: 'none', border: 'none', cursor: 'pointer' }}>← {areaSelecionada}</button>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: '#71717A', marginBottom: 14 }}>Agora escolha o tópico que você quer praticar:</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                    <button onClick={() => setTopicoSelecionado('todos')} className="tap"
                      style={{ width: '100%', padding: '12px 16px', borderRadius: 12, textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', cursor: 'pointer' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#818CF8' }}>🔀 Todos os tópicos de {areaSelecionada}</span>
                    </button>
                    {areaAtual?.topicos.map(t => (
                      <button key={t} onClick={() => setTopicoSelecionado(t)} className="tap"
                        style={{ width: '100%', padding: '12px 16px', borderRadius: 12, textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#E4E4E7' }}>{t}</span>
                        <span style={{ color: '#3F3F46', fontSize: '0.8rem' }}>→</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <button onClick={() => setTopicoSelecionado('')} style={{ fontSize: '0.75rem', color: '#52525B', background: 'none', border: 'none', cursor: 'pointer' }}>← {topicoSelecionado === 'todos' ? areaSelecionada : topicoSelecionado}</button>
                  </div>
                  <div style={{ ...card, padding: '16px 20px', marginBottom: 14 }}>
                    <div style={{ fontSize: '0.62rem', color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 12 }}>Quantidade de questões</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {[5, 10, 15, 20].map(n => (
                        <button key={n} onClick={() => setQtdQuestoes(n)} className="tap"
                          style={{ padding: '7px 14px', borderRadius: 9, fontWeight: 700, fontSize: '0.85rem', background: qtdQuestoes === n ? areaAtual?.cor || '#6366F1' : 'rgba(255,255,255,0.04)', color: qtdQuestoes === n ? '#fff' : '#71717A', border: 'none', cursor: 'pointer' }}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ ...card, padding: '14px 20px', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#E4E4E7' }}>⏱️ Cronômetro</div>
                        <div style={{ fontSize: '0.65rem', color: '#52525B', marginTop: 2 }}>{modoCronometro ? formatTempo(qtdQuestoes * 3 * 60) : 'Sem limite'}</div>
                      </div>
                      <button onClick={() => setModoCronometro(!modoCronometro)} className="tap"
                        style={{ width: 44, height: 24, borderRadius: 100, border: 'none', cursor: 'pointer', position: 'relative', background: modoCronometro ? areaAtual?.cor || '#6366F1' : 'rgba(255,255,255,0.1)' }}>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, transition: 'all .3s', left: modoCronometro ? 23 : 3 }} />
                      </button>
                    </div>
                  </div>
                  <button onClick={() => iniciarSimulado([areaSelecionada], topicoSelecionado === 'todos' ? undefined : topicoSelecionado)} className="tap"
                    style={{ width: '100%', padding: '16px', borderRadius: 15, fontWeight: 800, fontSize: '0.95rem', border: 'none', cursor: 'pointer', background: `linear-gradient(135deg,${areaAtual?.cor || '#6366F1'},${areaAtual?.cor || '#818CF8'})`, color: '#fff' }}>
                    Começar {topicoSelecionado === 'todos' ? areaSelecionada : topicoSelecionado} →
                  </button>
                </>
              )}
            </>
          )}

          {/* MODO PLANO */}
          {modoSelecionado === 'plano' && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: '3rem', marginBottom: 16 }}>📅</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#FAFAFA', marginBottom: 8 }}>Baseado no seu plano</div>
              <p style={{ fontSize: '0.82rem', color: '#71717A', marginBottom: 24, lineHeight: 1.6 }}>
                O sistema vai montar o simulado com base nas áreas que seu plano indica estudar essa semana — priorizando seus maiores gaps.
              </p>
              <div style={{ ...card, padding: '16px 20px', marginBottom: 20, textAlign: 'left' }}>
                <div style={{ fontSize: '0.62rem', color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 12 }}>Questões</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[10, 15, 20].map(n => (
                    <button key={n} onClick={() => setQtdQuestoes(n)} className="tap"
                      style={{ padding: '7px 14px', borderRadius: 9, fontWeight: 700, fontSize: '0.85rem', background: qtdQuestoes === n ? '#FBBF24' : 'rgba(255,255,255,0.04)', color: qtdQuestoes === n ? '#000' : '#71717A', border: 'none', cursor: 'pointer' }}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => iniciarSimulado(AREAS_CONFIG.map(a => a.area))} className="tap"
                style={{ width: '100%', padding: '16px', borderRadius: 15, fontWeight: 800, fontSize: '0.95rem', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#FBBF24,#F59E0B)', color: '#000' }}>
                Montar simulado do plano →
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── LOADING ──
  if (fase === 'loading') return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: bg, gap: 16 }}>
      <div style={{ width: 44, height: 44, border: '4px solid rgba(99,102,241,0.3)', borderTop: '4px solid #6366F1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <div style={{ color: '#52525B', fontSize: '0.85rem' }}>Montando seu simulado...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  // ── RESULTADO ──
  if (fase === 'resultado') {
    const acertos = respostas.filter(r => r.correta).length
    const percentual = Math.round((acertos / Math.max(questoes.length, 1)) * 100)
    return (
      <div style={{ minHeight: '100vh', background: bg, fontFamily: 'Plus Jakarta Sans,sans-serif' }}>
        <style>{`*{box-sizing:border-box} .tap{cursor:pointer;transition:all .15s} .tap:active{opacity:.7} a{text-decoration:none;color:inherit}`}</style>
        <div style={{ maxWidth: 520, margin: '0 auto', padding: '48px 16px 80px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: '0.72rem', color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Resultado</div>
          <div style={{ fontSize: '4.5rem', fontWeight: 900, letterSpacing: '-0.04em', color: cor(percentual), lineHeight: 1, marginBottom: 4 }}>{percentual}%</div>
          <div style={{ fontSize: '0.85rem', color: '#52525B', marginBottom: 32 }}>{acertos} de {questoes.length} acertos</div>
          <div style={{ width: '100%', ...card, padding: '18px 20px', marginBottom: 20 }}>
            <div style={{ fontSize: '0.62rem', color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 14 }}>Por área</div>
            {resultado.map(r => (
              <div key={r.area} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 5 }}>
                  <span style={{ color: '#E4E4E7' }}>{r.area}</span>
                  <span style={{ fontWeight: 800, color: cor((r.acertos / r.total) * 100) }}>{r.acertos}/{r.total}</span>
                </div>
                <div style={{ height: 5, borderRadius: 100, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 100, width: `${Math.round((r.acertos / r.total) * 100)}%`, background: cor((r.acertos / r.total) * 100) }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, width: '100%' }}>
            <button onClick={() => { setFase('menu'); setAreaSelecionada(''); setTopicoSelecionado(''); setAreasMistas([]) }} className="tap"
              style={{ padding: '14px', borderRadius: 13, fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', color: '#E4E4E7', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}>
              Novo simulado
            </button>
            <Link href="/dashboard">
              <button className="tap" style={{ width: '100%', padding: '14px', borderRadius: 13, fontWeight: 800, fontSize: '0.88rem', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#6366F1,#818CF8)', color: '#fff' }}>
                Ver painel →
              </button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── SIMULANDO ──
  const q = questoes[atual]
  const areaConfig = AREAS_CONFIG.find(a => a.area === q?.area) || AREAS_CONFIG[0]
  const progresso = Math.round((atual / questoes.length) * 100)
  const tempoPerc = modoCronometro ? (tempoRestante / tempoTotal) * 100 : 0
  const tempoAlerta = modoCronometro && tempoRestante < 60

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: 'Plus Jakarta Sans,sans-serif' }}>
      <style>{`*{box-sizing:border-box} .tap{-webkit-tap-highlight-color:transparent;cursor:pointer;transition:all .15s} .tap:active{opacity:.7;transform:scale(.97)} a{text-decoration:none;color:inherit}`}</style>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.06)' }}>
        <div style={{ height: '100%', background: areaConfig.cor, width: `${progresso}%`, transition: 'width .4s ease' }} />
      </div>
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.1rem' }}>{areaConfig.icon}</span>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: areaConfig.cor }}>{q?.area}</div>
            <div style={{ fontSize: '0.62rem', color: '#52525B' }}>{atual + 1}/{questoes.length}</div>
          </div>
        </div>
        {modoCronometro && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 80, height: 4, borderRadius: 100, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 100, width: `${tempoPerc}%`, background: tempoAlerta ? '#F87171' : '#6366F1', transition: 'width 1s linear' }} />
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: tempoAlerta ? '#F87171' : '#FAFAFA', fontVariantNumeric: 'tabular-nums' }}>
              {formatTempo(tempoRestante)}
            </span>
          </div>
        )}
      </div>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '16px 16px 100px' }}>
        {q?.fonte && (
          <div style={{ fontSize: '0.62rem', color: '#3F3F46', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span>📋</span><span style={{ fontWeight: 600 }}>{q.fonte}</span>
          </div>
        )}
        {q?.contexto && q.contexto.trim() && (
          <div style={{ marginBottom: 14 }}>
            <button onClick={() => setMostrarContexto(!mostrarContexto)} className="tap"
              style={{ fontSize: '0.72rem', fontWeight: 700, color: '#818CF8', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 8 }}>
              📄 Texto de apoio {mostrarContexto ? '▲' : '▼'}
            </button>
            {mostrarContexto && (
              <div style={{ borderRadius: 12, border: '1px solid rgba(99,102,241,0.15)', padding: '14px 16px', fontSize: '0.85rem', lineHeight: 1.7, color: '#A1A1AA', background: 'rgba(99,102,241,0.04)' }}>
                {parseContexto(q.contexto)}
              </div>
            )}
          </div>
        )}
        <div style={{ ...card, padding: '16px 18px', marginBottom: 14 }}>
          <p style={{ fontSize: '0.92rem', lineHeight: 1.7, color: '#FAFAFA', margin: 0 }}>{q?.enunciado}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {q?.alternativas.map(alt => {
            let bg2 = 'rgba(255,255,255,0.03)', border = '1px solid rgba(255,255,255,0.07)', textColor = '#A1A1AA'
            if (respostaSelecionada === alt.letra && !respondida) { bg2 = 'rgba(99,102,241,0.1)'; border = '1px solid #6366F1'; textColor = '#FAFAFA' }
            if (respondida) {
              if (alt.letra === q.resposta_correta) { bg2 = 'rgba(52,211,153,0.08)'; border = '1px solid rgba(52,211,153,0.4)'; textColor = '#34D399' }
              else if (alt.letra === respostaSelecionada) { bg2 = 'rgba(248,113,113,0.08)'; border = '1px solid rgba(248,113,113,0.4)'; textColor = '#F87171' }
            }
            return (
              <button key={alt.letra} onClick={() => !respondida && setRespostaSelecionada(alt.letra)} className="tap"
                style={{ width: '100%', textAlign: 'left', padding: '12px 14px', borderRadius: 12, display: 'flex', gap: 12, alignItems: 'flex-start', background: bg2, border, color: textColor, cursor: respondida ? 'default' : 'pointer' }}>
                <span style={{ fontWeight: 800, opacity: 0.5, flexShrink: 0 }}>{alt.letra}</span>
                <span style={{ lineHeight: 1.6, fontSize: '0.88rem' }}>{alt.texto}</span>
              </button>
            )
          })}
        </div>
        {respondida && (
          <div style={{ borderRadius: 12, padding: '12px 14px', marginBottom: 14, fontSize: '0.82rem', lineHeight: 1.6, background: respostaSelecionada === q?.resposta_correta ? 'rgba(52,211,153,0.06)' : 'rgba(248,113,113,0.06)', border: `1px solid ${respostaSelecionada === q?.resposta_correta ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'}`, color: '#A1A1AA' }}>
            <span style={{ fontWeight: 700, color: respostaSelecionada === q?.resposta_correta ? '#34D399' : '#F87171' }}>
              {respostaSelecionada === q?.resposta_correta ? '✓ Correto!' : `✗ Gabarito: ${q?.resposta_correta}`}
            </span>
            {q?.explicacao && <span> · {q.explicacao}</span>}
          </div>
        )}
        {!respondida ? (
          <button onClick={confirmar} disabled={!respostaSelecionada} className="tap"
            style={{ width: '100%', padding: '15px', borderRadius: 14, fontWeight: 800, fontSize: '0.92rem', border: 'none', cursor: respostaSelecionada ? 'pointer' : 'not-allowed', background: respostaSelecionada ? `linear-gradient(135deg,${areaConfig.cor},${areaConfig.cor}cc)` : 'rgba(255,255,255,0.04)', color: respostaSelecionada ? '#fff' : '#52525B' }}>
            Confirmar resposta
          </button>
        ) : (
          <button onClick={proxima} className="tap"
            style={{ width: '100%', padding: '15px', borderRadius: 14, fontWeight: 800, fontSize: '0.92rem', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#6366F1,#818CF8)', color: '#fff' }}>
            {atual < questoes.length - 1 ? 'Próxima →' : 'Ver resultado →'}
          </button>
        )}
      </div>
    </div>
  )
}
