'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Questao {
  id: string; area: string; subarea: string; enunciado: string
  contexto: string | null; alternativas: { letra: string; texto: string }[]
  resposta_correta: string; explicacao: string | null; fonte: string | null; ano: number | null
  vezes_errada: number
}

const AREA_COLORS: Record<string, string> = {
  'Matemática': '#818CF8', 'Linguagens': '#34D399',
  'Ciências Humanas': '#FBBF24', 'Ciências da Natureza': '#60A5FA',
}

function parseContexto(texto: string) {
  if (!texto) return null
  const partes = texto.split(/(!\[.*?\]\(.*?\))/g)
  return partes.map((parte, i) => {
    const imgMatch = parte.match(/!\[.*?\]\((.*?)\)/)
    if (imgMatch) {
      const url = imgMatch[1]
      if (url.includes('broken-image') || url.includes('svg')) return null
      return (
        <div key={i} style={{ margin: '10px 0', textAlign: 'center' }}>
          <img src={url} alt="Imagem" style={{ maxWidth: '100%', borderRadius: 8 }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        </div>
      )
    }
    if (!parte.trim()) return null
    const withBold = parte.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    return <span key={i} style={{ whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: withBold }} />
  }).filter(Boolean)
}

export default function Revisao() {
  const [user, setUser] = useState<any>(null)
  const [questoes, setQuestoes] = useState<Questao[]>([])
  const [atual, setAtual] = useState(0)
  const [resposta, setResposta] = useState<string | null>(null)
  const [respondida, setRespondida] = useState(false)
  const [loading, setLoading] = useState(true)
  const [fase, setFase] = useState<'revisao' | 'vazio' | 'fim'>('revisao')
  const [acertos, setAcertos] = useState(0)
  const [mostrarContexto, setMostrarContexto] = useState(true)
  const [explicacaoIA, setExplicacaoIA] = useState('')
  const [carregandoExplicacao, setCarregandoExplicacao] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      setUser(user)

      const { data: erradas } = await supabase
        .from('questoes_erradas')
        .select('questao_id, vezes_errada')
        .eq('user_id', user.id)
        .order('vezes_errada', { ascending: false })
        .limit(20)

      if (!erradas || erradas.length === 0) { setFase('vazio'); setLoading(false); return }

      const ids = erradas.map(e => e.questao_id)
      const { data: qs } = await supabase.from('questoes').select('*').in('id', ids)

      if (qs) {
        const comVezes = qs.map(q => ({
          ...q,
          vezes_errada: erradas.find(e => e.questao_id === q.id)?.vezes_errada || 1
        })).sort((a, b) => b.vezes_errada - a.vezes_errada)
        setQuestoes(comVezes)
      }
      setLoading(false)
    }
    load()
  }, [])

  async function confirmar() {
    if (!resposta || respondida) return
    setRespondida(true)
    const q = questoes[atual]
    const acertou = resposta === q.resposta_correta

    if (acertou) {
      setAcertos(a => a + 1)
      await supabase.from('questoes_erradas').delete()
        .eq('user_id', user.id).eq('questao_id', q.id)
    } else {
      // Busca explicação da IA
      setCarregandoExplicacao(true)
      try {
        const res = await fetch('/api/explicar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            enunciado: q.enunciado,
            contexto: q.contexto,
            alternativas: q.alternativas,
            respostaCorreta: q.resposta_correta,
            respostaDada: resposta,
            area: q.area,
          })
        })
        const data = await res.json()
        setExplicacaoIA(data.explicacao || '')
      } catch { setExplicacaoIA('') }
      setCarregandoExplicacao(false)

      // Incrementa contador de erros
      await supabase.from('questoes_erradas').update({
        vezes_errada: q.vezes_errada + 1,
        ultima_vez: new Date().toISOString(),
      }).eq('user_id', user.id).eq('questao_id', q.id)
    }
  }

  function proxima() {
    if (atual < questoes.length - 1) {
      setAtual(a => a + 1)
      setResposta(null)
      setRespondida(false)
      setExplicacaoIA('')
      setMostrarContexto(true)
    } else {
      setFase('fim')
    }
  }

  const bg = '#07070d'
  const card: React.CSSProperties = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16 }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg }}>
      <div style={{ width: 32, height: 32, border: '3px solid rgba(245,158,11,0.3)', borderTop: '3px solid #f59e0b', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (fase === 'vazio') return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg, padding: '0 20px' }}>
      <div style={{ textAlign: 'center', maxWidth: 320 }}>
        <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>🎉</div>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FAFAFA', marginBottom: 8 }}>Nada pra revisar!</h2>
        <p style={{ fontSize: '0.82rem', color: '#52525B', marginBottom: 24, lineHeight: 1.6 }}>Você ainda não errou nenhuma questão ou já revisou tudo. Faça um simulado primeiro.</p>
        <Link href="/simulado">
          <button style={{ padding: '12px 24px', borderRadius: 12, fontWeight: 800, fontSize: '0.88rem', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#6366F1,#818CF8)', color: '#fff' }}>
            Fazer simulado →
          </button>
        </Link>
      </div>
    </div>
  )

  if (fase === 'fim') return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg, padding: '0 20px' }}>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <div style={{ fontSize: '4rem', fontWeight: 900, color: acertos / questoes.length >= 0.7 ? '#34D399' : '#f87171', marginBottom: 8 }}>
          {Math.round((acertos / questoes.length) * 100)}%
        </div>
        <p style={{ fontSize: '0.85rem', color: '#52525B', marginBottom: 6 }}>{acertos} de {questoes.length} acertos na revisão</p>
        <p style={{ fontSize: '0.75rem', color: '#3F3F46', marginBottom: 24, lineHeight: 1.5 }}>
          Questões que você acertou foram removidas da sua lista. As que errou voltam amanhã.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <Link href="/dashboard">
            <button style={{ padding: '12px 20px', borderRadius: 12, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: '#E4E4E7' }}>
              Dashboard
            </button>
          </Link>
          <Link href="/simulado">
            <button style={{ padding: '12px 20px', borderRadius: 12, fontWeight: 800, fontSize: '0.85rem', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#6366F1,#818CF8)', color: '#fff' }}>
              Novo simulado →
            </button>
          </Link>
        </div>
      </div>
    </div>
  )

  const q = questoes[atual]
  const corArea = AREA_COLORS[q.area] || '#818CF8'
  const acertou = respondida && resposta === q.resposta_correta

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: 'Plus Jakarta Sans,sans-serif' }}>
      <style>{`*{box-sizing:border-box} .tap{-webkit-tap-highlight-color:transparent;cursor:pointer;transition:all .15s} .tap:active{opacity:.7;transform:scale(.97)} a{text-decoration:none;color:inherit}`}</style>

      {/* PROGRESSO */}
      <div style={{ height: 3, background: 'rgba(255,255,255,0.06)' }}>
        <div style={{ height: '100%', background: '#f59e0b', width: `${(atual / questoes.length) * 100}%`, transition: 'width .4s ease' }} />
      </div>

      {/* HEADER */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 100, background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
            🔄 Revisão
          </span>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: corArea }}>{q.area}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '0.68rem', color: '#52525B' }}>{atual + 1}/{questoes.length}</span>
          <span style={{ fontSize: '0.68rem', color: '#3F3F46' }}>Errada {q.vezes_errada}x</span>
          <Link href="/dashboard"><span style={{ fontSize: '0.72rem', color: '#52525B' }}>✕</span></Link>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '16px 16px 100px' }}>

        {/* FONTE */}
        {q.fonte && (
          <div style={{ fontSize: '0.62rem', color: '#3F3F46', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span>📋</span><span style={{ fontWeight: 600 }}>{q.fonte}</span>
          </div>
        )}

        {/* CONTEXTO COMPLETO */}
        {q.contexto && q.contexto.trim() && (
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

        {/* ENUNCIADO */}
        <div style={{ ...card, padding: '16px 18px', marginBottom: 14 }}>
          <p style={{ fontSize: '0.92rem', lineHeight: 1.7, color: '#FAFAFA', margin: 0 }}>{q.enunciado}</p>
        </div>

        {/* ALTERNATIVAS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {q.alternativas.map(alt => {
            let bg2 = 'rgba(255,255,255,0.03)', border = '1px solid rgba(255,255,255,0.07)', textColor = '#A1A1AA'
            if (resposta === alt.letra && !respondida) { bg2 = 'rgba(99,102,241,0.1)'; border = '1px solid #6366F1'; textColor = '#FAFAFA' }
            if (respondida) {
              if (alt.letra === q.resposta_correta) { bg2 = 'rgba(52,211,153,0.08)'; border = '1px solid rgba(52,211,153,0.4)'; textColor = '#34D399' }
              else if (alt.letra === resposta) { bg2 = 'rgba(248,113,113,0.08)'; border = '1px solid rgba(248,113,113,0.4)'; textColor = '#F87171' }
            }
            return (
              <button key={alt.letra} onClick={() => !respondida && setResposta(alt.letra)} className="tap"
                style={{ width: '100%', textAlign: 'left', padding: '12px 14px', borderRadius: 12, display: 'flex', gap: 12, alignItems: 'flex-start', background: bg2, border, color: textColor, cursor: respondida ? 'default' : 'pointer' }}>
                <span style={{ fontWeight: 800, opacity: 0.5, flexShrink: 0 }}>{alt.letra}</span>
                <span style={{ lineHeight: 1.6, fontSize: '0.88rem' }}>{alt.texto}</span>
              </button>
            )
          })}
        </div>

        {/* EXPLICAÇÃO IA — coração da revisão */}
        {respondida && (
          <div style={{ borderRadius: 14, padding: '16px 18px', marginBottom: 16, background: acertou ? 'rgba(52,211,153,0.05)' : 'rgba(99,102,241,0.05)', border: `1px solid ${acertou ? 'rgba(52,211,153,0.2)' : 'rgba(99,102,241,0.2)'}` }}>
            {acertou ? (
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#34D399', marginBottom: 6 }}>✓ Correto!</div>
                <p style={{ fontSize: '0.82rem', color: '#A1A1AA', margin: 0, lineHeight: 1.6 }}>
                  Muito bem! Essa questão saiu da sua lista de revisão. Continue assim.
                </p>
                {q.explicacao && (
                  <p style={{ fontSize: '0.8rem', color: '#71717A', marginTop: 10, lineHeight: 1.6, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
                    <strong style={{ color: '#A1A1AA' }}>Por que a resposta é {q.resposta_correta}:</strong> {q.explicacao}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#F87171', marginBottom: 8 }}>
                  ✗ Incorreto — gabarito: {q.resposta_correta}
                </div>
                {carregandoExplicacao ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                    <div style={{ width: 16, height: 16, border: '2px solid rgba(99,102,241,0.3)', borderTop: '2px solid #818CF8', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: '0.78rem', color: '#52525B' }}>Professor IA analisando seu erro...</span>
                  </div>
                ) : explicacaoIA ? (
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#818CF8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      🧠 Por que você errou e o que aprender
                    </div>
                    <p style={{ fontSize: '0.83rem', color: '#A1A1AA', margin: 0, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                      {explicacaoIA}
                    </p>
                  </div>
                ) : q.explicacao ? (
                  <p style={{ fontSize: '0.83rem', color: '#A1A1AA', margin: 0, lineHeight: 1.7 }}>
                    <strong style={{ color: '#FAFAFA' }}>Gabarito comentado:</strong> {q.explicacao}
                  </p>
                ) : null}
              </div>
            )}
            {/* BOTÃO VIDEOAULA — aparece quando erra */}
            {respondida && !acertou && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ fontSize: '0.72rem', color: '#52525B', marginBottom: 8 }}>Ainda com dúvida? Assista uma videoaula sobre esse conteúdo:</p>
                <Link href={`/videoaulas?area=${encodeURIComponent(q.area)}&topico=${encodeURIComponent(q.subarea || q.area)}`}>
                  <button className="tap" style={{ width: '100%', padding: '10px', borderRadius: 10, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#818CF8' }}>
                    🎬 Ver videoaula sobre {q.subarea || q.area}
                  </button>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* BOTÃO */}
        {!respondida ? (
          <button onClick={confirmar} disabled={!resposta} className="tap"
            style={{ width: '100%', padding: '15px', borderRadius: 14, fontWeight: 800, fontSize: '0.92rem', border: 'none', cursor: resposta ? 'pointer' : 'not-allowed', background: resposta ? 'linear-gradient(135deg,#f59e0b,#fb923c)' : 'rgba(255,255,255,0.04)', color: resposta ? '#000' : '#52525B' }}>
            Confirmar resposta
          </button>
        ) : (
          <button onClick={proxima} disabled={carregandoExplicacao} className="tap"
            style={{ width: '100%', padding: '15px', borderRadius: 14, fontWeight: 800, fontSize: '0.92rem', border: 'none', cursor: carregandoExplicacao ? 'wait' : 'pointer', background: 'linear-gradient(135deg,#6366F1,#818CF8)', color: '#fff', opacity: carregandoExplicacao ? 0.6 : 1 }}>
            {carregandoExplicacao ? 'Gerando explicação...' : atual < questoes.length - 1 ? 'Próxima →' : 'Ver resultado →'}
          </button>
        )}
      </div>
    </div>
  )
}
