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
  { area: 'Matemática', icon: '📐', cor: '#818CF8' },
  { area: 'Linguagens', icon: '📝', cor: '#34D399' },
  { area: 'Ciências Humanas', icon: '🌍', cor: '#FBBF24' },
  { area: 'Ciências da Natureza', icon: '🔬', cor: '#60A5FA' },
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
    // Processa negrito **texto**
    const withBold = parte.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    return <span key={i} style={{ whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: withBold }} />
  }).filter(Boolean)
}

export default function Simulado() {
  const [user, setUser] = useState<any>(null)
  const [fase, setFase] = useState<'config' | 'loading' | 'simulando' | 'resultado'>('config')
  const [areasSelecionadas, setAreasSelecionadas] = useState<string[]>([])
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

  // Cronômetro
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

  function toggleArea(area: string) {
    setAreasSelecionadas(prev =>
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    )
  }

  async function iniciarSimulado() {
    const areas = areasSelecionadas.length > 0 ? areasSelecionadas : AREAS_CONFIG.map(a => a.area)
    setFase('loading')

    const { data: desemp } = await supabase.from('desempenho').select('*').eq('user_id', user.id).order('percentual')
    const qtdPorArea = Math.ceil(qtdQuestoes / areas.length)
    let todasQuestoes: Questao[] = []

    for (const area of areas) {
      const { data } = await supabase.from('questoes').select('*').eq('area', area)
        .order('created_at', { ascending: false }).limit(qtdPorArea + 5)
      if (data) todasQuestoes.push(...data)
    }

    todasQuestoes = todasQuestoes.sort(() => Math.random() - 0.5).slice(0, qtdQuestoes)

    const { data: sim } = await supabase.from('simulados')
      .insert({ user_id: user.id, total_questoes: todasQuestoes.length }).select().single()
    if (sim) setSimuladoId(sim.id)

    if (modoCronometro) {
      const tempo = qtdQuestoes * 3 * 60 // 3 min por questão
      setTempoTotal(tempo)
      setTempoRestante(tempo)
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
    const novaResposta = { questao_id: q.id, correta, area: q.area }
    setRespostas(prev => [...prev, novaResposta])
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
    } else {
      await finalizar()
    }
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
            percentual: Math.round((novosAcertos / novoTotal) * 100), updated_at: new Date().toISOString(),
          }).eq('id', ex.id)
        } else {
          await supabase.from('desempenho').insert({
            user_id: user.id, area, total_respondidas: v.total, total_acertos: v.acertos,
            percentual: Math.round((v.acertos / v.total) * 100),
          })
        }
      }
      const bonus = Math.round((acertos / Math.max(todas.length, 1)) * 20)
      await atualizarGamificacao(user.id, 'simulado', bonus, todas.length)
    }
    setFase('resultado')
  }

  function formatTempo(s: number) {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  }

  const bg = '#07070d'
  const card: React.CSSProperties = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16 }
  const cor = (n: number) => n >= 70 ? '#34D399' : n >= 50 ? '#FBBF24' : '#F87171'

  // ── CONFIG ──
  if (fase === 'config') return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: 'Plus Jakarta Sans,sans-serif' }}>
      <style>{`*{box-sizing:border-box} .tap{-webkit-tap-highlight-color:transparent;cursor:pointer;transition:all .15s} .tap:active{opacity:.7;transform:scale(.97)} a{text-decoration:none;color:inherit}`}</style>
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(7,7,13,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 16px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 800, fontSize: '1rem', color: '#FAFAFA' }}>Simulado<span style={{ color: '#818CF8' }}>IA</span></span>
        <Link href="/dashboard"><span style={{ fontSize: '0.78rem', color: '#52525B' }}>← Voltar</span></Link>
      </div>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 16px 80px' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#FAFAFA' }}>🚀 Configurar simulado</h1>
          <p style={{ color: '#52525B', fontSize: '0.8rem', marginTop: 3 }}>Escolha as matérias e o número de questões.</p>
        </div>

        {/* ÁREAS */}
        <div style={{ ...card, padding: '18px 20px', marginBottom: 14 }}>
          <div style={{ fontSize: '0.62rem', color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 14 }}>
            Matérias {areasSelecionadas.length === 0 ? '(todas selecionadas)' : `(${areasSelecionadas.length} selecionadas)`}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {AREAS_CONFIG.map(a => {
              const sel = areasSelecionadas.includes(a.area) || areasSelecionadas.length === 0
              const ativo = areasSelecionadas.includes(a.area)
              return (
                <button key={a.area} onClick={() => toggleArea(a.area)} className="tap"
                  style={{ padding: '14px 12px', borderRadius: 13, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, background: ativo ? `rgba(${a.cor.replace('#','').match(/../g)?.map(h=>parseInt(h,16)).join(',')},0.12)` : 'rgba(255,255,255,0.03)', border: `1px solid ${ativo ? a.cor + '44' : 'rgba(255,255,255,0.07)'}`, cursor: 'pointer' }}>
                  <span style={{ fontSize: '1.4rem' }}>{a.icon}</span>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: ativo ? a.cor : '#A1A1AA' }}>{a.area}</div>
                    {ativo && <div style={{ fontSize: '0.6rem', color: a.cor, marginTop: 2 }}>✓ Selecionada</div>}
                  </div>
                </button>
              )
            })}
          </div>
          {areasSelecionadas.length > 0 && (
            <button onClick={() => setAreasSelecionadas([])} className="tap"
              style={{ marginTop: 10, fontSize: '0.7rem', color: '#52525B', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
              Limpar seleção (usar todas)
            </button>
          )}
        </div>

        {/* QTD QUESTÕES */}
        <div style={{ ...card, padding: '18px 20px', marginBottom: 14 }}>
          <div style={{ fontSize: '0.62rem', color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 14 }}>
            Número de questões
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[5, 10, 15, 20, 30, 45].map(n => (
              <button key={n} onClick={() => setQtdQuestoes(n)} className="tap"
                style={{ padding: '8px 16px', borderRadius: 10, fontWeight: 700, fontSize: '0.85rem', background: qtdQuestoes === n ? '#6366F1' : 'rgba(255,255,255,0.04)', color: qtdQuestoes === n ? '#fff' : '#71717A', border: `1px solid ${qtdQuestoes === n ? '#6366F1' : 'rgba(255,255,255,0.08)'}`, cursor: 'pointer' }}>
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* CRONÔMETRO */}
        <div style={{ ...card, padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#E4E4E7' }}>⏱️ Modo cronometrado</div>
              <div style={{ fontSize: '0.68rem', color: '#52525B', marginTop: 2 }}>
                {modoCronometro ? `${formatTempo(qtdQuestoes * 3 * 60)} no total (3 min/questão)` : 'Sem limite de tempo'}
              </div>
            </div>
            <button onClick={() => setModoCronometro(!modoCronometro)} className="tap"
              style={{ width: 44, height: 24, borderRadius: 100, border: 'none', cursor: 'pointer', position: 'relative', transition: 'all .3s', background: modoCronometro ? '#6366F1' : 'rgba(255,255,255,0.1)' }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, transition: 'all .3s', left: modoCronometro ? 23 : 3 }} />
            </button>
          </div>
        </div>

        <button onClick={iniciarSimulado} className="tap"
          style={{ width: '100%', padding: '16px', borderRadius: 15, fontWeight: 800, fontSize: '0.95rem', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#6366F1,#818CF8)', color: '#fff', boxShadow: '0 6px 20px rgba(99,102,241,0.35)' }}>
          Começar simulado →
        </button>
      </div>
    </div>
  )

  // ── LOADING ──
  if (fase === 'loading') return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: bg, gap: 16 }}>
      <div style={{ width: 44, height: 44, border: '4px solid rgba(99,102,241,0.3)', borderTop: '4px solid #6366F1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <div style={{ color: '#52525B', fontSize: '0.85rem' }}>Montando seu simulado personalizado...</div>
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
        <div style={{ maxWidth: 520, margin: '0 auto', padding: '40px 16px 80px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Resultado</div>
          <div style={{ fontSize: '4rem', fontWeight: 900, letterSpacing: '-0.04em', color: cor(percentual), lineHeight: 1, marginBottom: 4 }}>{percentual}%</div>
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
            <button onClick={() => setFase('config')} className="tap"
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
  const progresso = Math.round((atual / questoes.length) * 100)
  const areaConfig = AREAS_CONFIG.find(a => a.area === q.area) || AREAS_CONFIG[0]
  const tempoPerc = modoCronometro ? (tempoRestante / tempoTotal) * 100 : 0
  const tempoAlerta = modoCronometro && tempoRestante < 60

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: 'Plus Jakarta Sans,sans-serif' }}>
      <style>{`*{box-sizing:border-box} .tap{-webkit-tap-highlight-color:transparent;cursor:pointer;transition:all .15s} .tap:active{opacity:.7;transform:scale(.97)} a{text-decoration:none;color:inherit}`}</style>

      {/* PROGRESS */}
      <div style={{ height: 3, background: 'rgba(255,255,255,0.06)' }}>
        <div style={{ height: '100%', background: areaConfig.cor, width: `${progresso}%`, transition: 'width .4s ease' }} />
      </div>

      {/* HEADER */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.1rem' }}>{areaConfig.icon}</span>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: areaConfig.cor }}>{q.area}</div>
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

        {/* FONTE */}
        {q.fonte && (
          <div style={{ fontSize: '0.62rem', color: '#3F3F46', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>📋</span>
            <span style={{ fontWeight: 600 }}>{q.fonte}</span>
          </div>
        )}

        {/* CONTEXTO */}
        {q.contexto && q.contexto.trim() && (
          <div style={{ marginBottom: 14 }}>
            <button onClick={() => setMostrarContexto(!mostrarContexto)} className="tap"
              style={{ fontSize: '0.72rem', fontWeight: 700, color: '#818CF8', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
              📄 Texto de apoio {mostrarContexto ? '▲' : '▼'}
            </button>
            {mostrarContexto && (
              <div style={{ borderRadius: 12, border: '1px solid rgba(99,102,241,0.15)', padding: '14px 16px', fontSize: '0.85rem', lineHeight: 1.7, color: '#A1A1AA', background: 'rgba(99,102,241,0.04)' }}>
                {parseContexto(q.contexto)}
              </div>
            )}
          </div>
        )}

        {/* ENUNCIADO */}
        <div style={{ ...card, padding: '16px 18px', marginBottom: 14 }}>
          <p style={{ fontSize: '0.92rem', lineHeight: 1.7, color: '#FAFAFA', margin: 0 }}>{q.enunciado}</p>
        </div>

        {/* ALTERNATIVAS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {q.alternativas.map(alt => {
            let bg2 = 'rgba(255,255,255,0.03)', border = '1px solid rgba(255,255,255,0.07)', color = '#A1A1AA'
            if (respostaSelecionada === alt.letra && !respondida) { bg2 = 'rgba(99,102,241,0.1)'; border = '1px solid #6366F1'; color = '#FAFAFA' }
            if (respondida) {
              if (alt.letra === q.resposta_correta) { bg2 = 'rgba(52,211,153,0.08)'; border = '1px solid rgba(52,211,153,0.4)'; color = '#34D399' }
              else if (alt.letra === respostaSelecionada) { bg2 = 'rgba(248,113,113,0.08)'; border = '1px solid rgba(248,113,113,0.4)'; color = '#F87171' }
            }
            return (
              <button key={alt.letra} onClick={() => !respondida && setRespostaSelecionada(alt.letra)} className="tap"
                style={{ width: '100%', textAlign: 'left', padding: '12px 14px', borderRadius: 12, display: 'flex', gap: 12, alignItems: 'flex-start', background: bg2, border, color, cursor: respondida ? 'default' : 'pointer' }}>
                <span style={{ fontWeight: 800, opacity: 0.5, flexShrink: 0, marginTop: 1 }}>{alt.letra}</span>
                <span style={{ lineHeight: 1.6, fontSize: '0.88rem' }}>{alt.texto}</span>
              </button>
            )
          })}
        </div>

        {/* GABARITO */}
        {respondida && (
          <div style={{ borderRadius: 12, padding: '12px 14px', marginBottom: 14, fontSize: '0.82rem', lineHeight: 1.6, background: respostaSelecionada === q.resposta_correta ? 'rgba(52,211,153,0.06)' : 'rgba(248,113,113,0.06)', border: `1px solid ${respostaSelecionada === q.resposta_correta ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'}`, color: '#A1A1AA' }}>
            <span style={{ fontWeight: 700, color: respostaSelecionada === q.resposta_correta ? '#34D399' : '#F87171' }}>
              {respostaSelecionada === q.resposta_correta ? '✓ Correto!' : `✗ Gabarito: ${q.resposta_correta}`}
            </span>
            {q.explicacao && <span> · {q.explicacao}</span>}
          </div>
        )}

        {/* BOTÃO */}
        {!respondida ? (
          <button onClick={confirmar} disabled={!respostaSelecionada} className="tap"
            style={{ width: '100%', padding: '15px', borderRadius: 14, fontWeight: 800, fontSize: '0.92rem', border: 'none', cursor: respostaSelecionada ? 'pointer' : 'not-allowed', background: respostaSelecionada ? 'linear-gradient(135deg,#6366F1,#818CF8)' : 'rgba(255,255,255,0.04)', color: respostaSelecionada ? '#fff' : '#52525B' }}>
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
