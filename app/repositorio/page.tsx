'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface TopicoItem { id: string; area: string; topico: string; slug: string; visualizacoes: number }
interface MapaRamo { titulo: string; cor: string; filhos: string[] }
interface Conteudo {
  id: string; area: string; topico: string; slug: string; resumo: string
  mapa_mental: { centro: string; ramos: MapaRamo[] }
  dicas: string[]; questoes_exemplo: any[]; visualizacoes: number
}

const AREA_CONFIG: Record<string, { icon: string; cor: string }> = {
  'Matemática':           { icon: '📐', cor: '#818CF8' },
  'Linguagens':           { icon: '📝', cor: '#34D399' },
  'Ciências Humanas':     { icon: '🌍', cor: '#FBBF24' },
  'Ciências da Natureza': { icon: '🔬', cor: '#60A5FA' },
}

function MapaMental({ mapa }: { mapa: any }) {
  if (!mapa?.ramos) return null
  return (
    <div style={{ padding: '20px 0' }}>
      {/* CENTRO */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ display: 'inline-block', padding: '12px 28px', borderRadius: 100, background: 'linear-gradient(135deg,#6366F1,#818CF8)', color: '#fff', fontWeight: 800, fontSize: '1rem', boxShadow: '0 4px 20px rgba(99,102,241,0.4)' }}>
          {mapa.centro}
        </div>
      </div>
      {/* RAMOS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {mapa.ramos.map((ramo: MapaRamo, i: number) => (
          <div key={i} style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid ${ramo.cor}33` }}>
            <div style={{ padding: '10px 14px', background: `${ramo.cor}18`, borderBottom: `1px solid ${ramo.cor}22` }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: ramo.cor }}>{ramo.titulo}</span>
            </div>
            <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.02)' }}>
              {ramo.filhos.map((f, j) => (
                <div key={j} style={{ fontSize: '0.78rem', color: '#A1A1AA', padding: '3px 0', display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ color: ramo.cor, fontSize: '0.6rem' }}>●</span>{f}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Repositorio() {
  const [topicos, setTopicos] = useState<TopicoItem[]>([])
  const [conteudo, setConteudo] = useState<Conteudo | null>(null)
  const [areaSel, setAreaSel] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingConteudo, setLoadingConteudo] = useState(false)
  const [busca, setBusca] = useState('')
  const [abaAtiva, setAbaAtiva] = useState<'resumo'|'mapa'|'dicas'|'questoes'>('resumo')
  const [respostaQ, setRespostaQ] = useState<Record<number,string>>({})
  const [respondidaQ, setRespondidaQ] = useState<Record<number,boolean>>({})

  useEffect(() => {
    async function load() {
      const params = new URLSearchParams(window.location.search)
      const slug = params.get('slug')
      if (slug) { abrirSlug(slug); return }
      const res = await fetch('/api/repositorio')
      const data = await res.json()
      setTopicos(data.topicos || [])
      setLoading(false)
    }
    load()
  }, [])

  async function abrirSlug(slug: string) {
    setLoadingConteudo(true)
    const res = await fetch(`/api/repositorio?slug=${slug}`)
    const data = await res.json()
    setConteudo(data.conteudo)
    setAbaAtiva('resumo')
    setRespostaQ({}); setRespondidaQ({})
    setLoadingConteudo(false)
    if (!topicos.length) {
      const r2 = await fetch('/api/repositorio')
      const d2 = await r2.json()
      setTopicos(d2.topicos || [])
    }
    setLoading(false)
  }

  const areas = [...new Set(topicos.map(t => t.area))]
  const topicosFiltrados = topicos.filter(t =>
    (!areaSel || t.area === areaSel) &&
    (!busca || t.topico.toLowerCase().includes(busca.toLowerCase()))
  )

  const bg = '#07070d'
  const card: React.CSSProperties = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16 }

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: 'Plus Jakarta Sans,sans-serif' }}>
      <style>{`
        *{box-sizing:border-box}
        .tap{-webkit-tap-highlight-color:transparent;cursor:pointer;transition:all .15s}
        .tap:active{opacity:.7;transform:scale(.97)}
        a{text-decoration:none;color:inherit}
        .topico-card:hover{border-color:rgba(99,102,241,0.3)!important;background:rgba(99,102,241,0.04)!important;transform:translateY(-1px)}
        .topico-card{transition:all .2s}
        .aba:hover{color:#FAFAFA!important}
      `}</style>

      {/* NAV */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(7,7,13,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 16px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 800, fontSize: '1rem', color: '#FAFAFA' }}>Simulado<span style={{ color: '#818CF8' }}>IA</span></span>
        {conteudo ? (
          <button onClick={() => setConteudo(null)} className="tap" style={{ fontSize: '0.78rem', color: '#52525B', background: 'none', border: 'none', cursor: 'pointer' }}>← Repositório</button>
        ) : (
          <Link href="/dashboard"><span style={{ fontSize: '0.78rem', color: '#52525B' }}>← Voltar</span></Link>
        )}
      </div>

      {/* CONTEÚDO DE UM TÓPICO */}
      {conteudo && (
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px 80px' }}>
          {loadingConteudo ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ width: 36, height: 36, border: '3px solid rgba(99,102,241,0.3)', borderTop: '3px solid #6366F1', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 14px' }} />
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : (
            <>
              {/* HEADER */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: '1.2rem' }}>{AREA_CONFIG[conteudo.area]?.icon}</span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: AREA_CONFIG[conteudo.area]?.cor || '#818CF8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{conteudo.area}</span>
                </div>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-0.03em', color: '#FAFAFA', marginBottom: 6 }}>{conteudo.topico}</h1>
                <span style={{ fontSize: '0.68rem', color: '#3F3F46' }}>👁 {conteudo.visualizacoes || 1} visualizações</span>
              </div>

              {/* ABAS */}
              <div style={{ display: 'flex', gap: 2, marginBottom: 20, background: 'rgba(255,255,255,0.03)', padding: 4, borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)' }}>
                {([['resumo','📝 Resumo'],['mapa','🗺️ Mapa mental'],['dicas','💡 Dicas'],['questoes','🎯 Questões']] as const).map(([id, label]) => (
                  <button key={id} onClick={() => setAbaAtiva(id)} className="tap aba"
                    style={{ flex: 1, padding: '8px 4px', borderRadius: 9, fontSize: '0.72rem', fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all .2s', background: abaAtiva === id ? '#6366F1' : 'transparent', color: abaAtiva === id ? '#fff' : '#71717A' }}>
                    {label}
                  </button>
                ))}
              </div>

              {/* ABA: RESUMO */}
              {abaAtiva === 'resumo' && (
                <div style={{ ...card, padding: '20px 24px' }}>
                  <p style={{ fontSize: '0.9rem', lineHeight: 1.8, color: '#C4C4C4', whiteSpace: 'pre-wrap', margin: 0 }}>{conteudo.resumo}</p>
                </div>
              )}

              {/* ABA: MAPA MENTAL */}
              {abaAtiva === 'mapa' && (
                <div style={{ ...card, padding: '20px' }}>
                  <MapaMental mapa={conteudo.mapa_mental} />
                </div>
              )}

              {/* ABA: DICAS */}
              {abaAtiva === 'dicas' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(conteudo.dicas || []).map((d, i) => (
                    <div key={i} style={{ ...card, padding: '14px 18px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#6366F1,#818CF8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                        {i + 1}
                      </div>
                      <p style={{ fontSize: '0.87rem', lineHeight: 1.6, color: '#C4C4C4', margin: 0 }}>{d}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* ABA: QUESTÕES */}
              {abaAtiva === 'questoes' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {(conteudo.questoes_exemplo || []).map((q, qi) => (
                    <div key={qi} style={{ ...card, padding: '18px 20px' }}>
                      <div style={{ fontSize: '0.62rem', color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 10 }}>Questão exemplo</div>
                      <p style={{ fontSize: '0.9rem', lineHeight: 1.7, color: '#FAFAFA', marginBottom: 14 }}>{q.enunciado}</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                        {(q.alternativas || []).map((a: any) => {
                          const sel = respostaQ[qi] === a.letra
                          const resp = respondidaQ[qi]
                          let bg2 = 'rgba(255,255,255,0.03)', border = '1px solid rgba(255,255,255,0.07)', textColor = '#A1A1AA'
                          if (sel && !resp) { bg2 = 'rgba(99,102,241,0.1)'; border = '1px solid #6366F1'; textColor = '#FAFAFA' }
                          if (resp) {
                            if (a.letra === q.resposta_correta) { bg2 = 'rgba(52,211,153,0.08)'; border = '1px solid rgba(52,211,153,0.4)'; textColor = '#34D399' }
                            else if (sel) { bg2 = 'rgba(248,113,113,0.08)'; border = '1px solid rgba(248,113,113,0.4)'; textColor = '#F87171' }
                          }
                          return (
                            <button key={a.letra} onClick={() => !resp && setRespostaQ(r => ({ ...r, [qi]: a.letra }))} className="tap"
                              style={{ width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 10, display: 'flex', gap: 10, background: bg2, border, color: textColor, cursor: resp ? 'default' : 'pointer' }}>
                              <span style={{ fontWeight: 800, opacity: 0.5 }}>{a.letra}</span>
                              <span style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>{a.texto}</span>
                            </button>
                          )
                        })}
                      </div>
                      {!respondidaQ[qi] && respostaQ[qi] && (
                        <button onClick={() => setRespondidaQ(r => ({ ...r, [qi]: true }))} className="tap"
                          style={{ width: '100%', marginTop: 12, padding: '12px', borderRadius: 11, fontWeight: 800, fontSize: '0.88rem', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#6366F1,#818CF8)', color: '#fff' }}>
                          Confirmar
                        </button>
                      )}
                      {respondidaQ[qi] && (
                        <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 11, background: respostaQ[qi] === q.resposta_correta ? 'rgba(52,211,153,0.06)' : 'rgba(248,113,113,0.06)', border: `1px solid ${respostaQ[qi] === q.resposta_correta ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'}`, fontSize: '0.83rem', color: '#A1A1AA', lineHeight: 1.6 }}>
                          <span style={{ fontWeight: 700, color: respostaQ[qi] === q.resposta_correta ? '#34D399' : '#F87171' }}>
                            {respostaQ[qi] === q.resposta_correta ? '✓ Correto!' : `✗ Gabarito: ${q.resposta_correta}`}
                          </span>
                          {q.explicacao && <span> — {q.explicacao}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* CTAs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 24 }}>
                <Link href={`/simulado`}>
                  <button className="tap" style={{ width: '100%', padding: '13px', borderRadius: 13, fontWeight: 800, fontSize: '0.85rem', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#6366F1,#818CF8)', color: '#fff' }}>
                    🚀 Praticar no simulado
                  </button>
                </Link>
                <Link href={`/videoaulas?area=${encodeURIComponent(conteudo.area)}&topico=${encodeURIComponent(conteudo.topico)}`}>
                  <button className="tap" style={{ width: '100%', padding: '13px', borderRadius: 13, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: '#E4E4E7' }}>
                    🎬 Ver videoaulas
                  </button>
                </Link>
              </div>
            </>
          )}
        </div>
      )}

      {/* LISTA DE TÓPICOS */}
      {!conteudo && (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px 80px' }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#FAFAFA', marginBottom: 4 }}>
              📚 Repositório ENEM
            </h1>
            <p style={{ fontSize: '0.8rem', color: '#52525B' }}>
              Todo o conteúdo que cai no ENEM, organizado por área e tópico — resumos, mapas mentais, dicas e questões de exemplo.
            </p>
          </div>

          {/* BUSCA */}
          <div style={{ marginBottom: 20 }}>
            <input type="text" placeholder="🔍 Buscar tópico..." value={busca} onChange={e => setBusca(e.target.value)}
              style={{ width: '100%', padding: '12px 16px', borderRadius: 12, fontSize: '0.9rem', outline: 'none', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: '#FAFAFA' }} />
          </div>

          {/* FILTRO DE ÁREA */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            <button onClick={() => setAreaSel('')} className="tap"
              style={{ padding: '7px 14px', borderRadius: 100, fontSize: '0.78rem', fontWeight: 600, background: !areaSel ? '#6366F1' : 'rgba(255,255,255,0.04)', color: !areaSel ? '#fff' : '#71717A', border: 'none', cursor: 'pointer' }}>
              Todas
            </button>
            {areas.map(a => (
              <button key={a} onClick={() => setAreaSel(a)} className="tap"
                style={{ padding: '7px 14px', borderRadius: 100, fontSize: '0.78rem', fontWeight: 600, background: areaSel === a ? AREA_CONFIG[a]?.cor || '#6366F1' : 'rgba(255,255,255,0.04)', color: areaSel === a ? '#fff' : '#71717A', border: 'none', cursor: 'pointer' }}>
                {AREA_CONFIG[a]?.icon} {a.split(' ')[0]}
              </button>
            ))}
          </div>

          {/* GRID DE TÓPICOS */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ width: 36, height: 36, border: '3px solid rgba(99,102,241,0.3)', borderTop: '3px solid #6366F1', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 14px' }} />
              <p style={{ color: '#52525B', fontSize: '0.82rem' }}>Carregando repositório...</p>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : topicosFiltrados.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <p style={{ color: '#52525B', fontSize: '0.85rem' }}>Repositório ainda sendo gerado. Aguarde ou volte em breve.</p>
              <p style={{ color: '#3F3F46', fontSize: '0.75rem', marginTop: 8 }}>O administrador pode gerar o conteúdo em /api/gerar-repositorio</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
              {topicosFiltrados.map(t => {
                const cfg = AREA_CONFIG[t.area] || { icon: '📚', cor: '#818CF8' }
                return (
                  <button key={t.id} onClick={() => abrirSlug(t.slug)} className="tap topico-card"
                    style={{ textAlign: 'left', padding: '16px 18px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: '1.1rem' }}>{cfg.icon}</span>
                      <span style={{ fontSize: '0.62rem', color: cfg.cor, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t.area.split(' ')[0]}</span>
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#FAFAFA', marginBottom: 8 }}>{t.topico}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: '0.62rem', padding: '2px 8px', borderRadius: 100, background: 'rgba(99,102,241,0.1)', color: '#818CF8' }}>📝 Resumo</span>
                      <span style={{ fontSize: '0.62rem', padding: '2px 8px', borderRadius: 100, background: 'rgba(99,102,241,0.1)', color: '#818CF8' }}>🗺️ Mapa</span>
                      <span style={{ fontSize: '0.62rem', padding: '2px 8px', borderRadius: 100, background: 'rgba(99,102,241,0.1)', color: '#818CF8' }}>🎯 Questões</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
