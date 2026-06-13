'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Video {
  videoId: string; titulo: string; canal: string
  thumbnail: string; url: string; embedUrl: string
}

const AREAS_TOPICOS = [
  { area: 'Matemática', icon: '📐', cor: '#818CF8',
    topicos: ['Funções','Geometria Plana','Geometria Espacial','Probabilidade','Estatística','Progressões','Logaritmo','Trigonometria'] },
  { area: 'Linguagens', icon: '📝', cor: '#34D399',
    topicos: ['Interpretação de Texto','Literatura Brasileira','Gramática','Figuras de Linguagem','Redação','Variação Linguística'] },
  { area: 'Ciências Humanas', icon: '🌍', cor: '#FBBF24',
    topicos: ['História do Brasil','História Geral','Geografia do Brasil','Geografia Mundial','Filosofia','Sociologia'] },
  { area: 'Ciências da Natureza', icon: '🔬', cor: '#60A5FA',
    topicos: ['Biologia','Química','Física','Ecologia','Genética','Termodinâmica','Eletricidade'] },
]

export default function Videoaulas() {
  const [user, setUser] = useState<any>(null)
  const [areaSel, setAreaSel] = useState('')
  const [topicoSel, setTopicoSel] = useState('')
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(false)
  const [videoAtivo, setVideoAtivo] = useState<Video | null>(null)
  const [desempenho, setDesempenho] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      setUser(user)
      const { data } = await supabase.from('desempenho').select('*').eq('user_id', user.id).order('percentual')
      setDesempenho(data || [])

      const params = new URLSearchParams(window.location.search)
      const area = params.get('area')
      const topico = params.get('topico')
      const enunciado = params.get('enunciado') || ''
      if (area) { setAreaSel(area); if (topico) { setTopicoSel(topico); buscarVideos(area, topico, enunciado) } }
    }
    load()
  }, [])

  async function buscarVideos(area: string, topico: string, enunciado = '') {
    setLoading(true)
    setVideoAtivo(null)
    try {
      const res = await fetch(`/api/videoaulas?area=${encodeURIComponent(area)}&topico=${encodeURIComponent(topico)}&enunciado=${encodeURIComponent(enunciado)}`)
      const data = await res.json()
      setVideos(data.videos || [])
    } catch { setVideos([]) }
    setLoading(false)
  }

  function selecionar(area: string, topico: string) {
    setAreaSel(area); setTopicoSel(topico)
    buscarVideos(area, topico)
  }

  function voltarParaSelecao() {
    setAreaSel(''); setTopicoSel(''); setVideos([]); setVideoAtivo(null)
  }

  const bg = '#07070d'
  const card: React.CSSProperties = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16 }
  const areaAtual = AREAS_TOPICOS.find(a => a.area === areaSel)
  const piorArea = desempenho[0]

  // Mostra a seleção (área/tópico) quando ainda não escolheu área OU não tem resultados ainda
  const mostrarSelecao = !areaSel

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: 'Plus Jakarta Sans,sans-serif' }}>
      <style>{`
        *{box-sizing:border-box}
        .tap{-webkit-tap-highlight-color:transparent;cursor:pointer;transition:all .15s}
        .tap:active{opacity:.7;transform:scale(.97)}
        a{text-decoration:none;color:inherit}
        .hover-card:hover{border-color:rgba(99,102,241,0.3)!important;background:rgba(99,102,241,0.04)!important}
        .content-grid{display:grid;grid-template-columns:280px 1fr;gap:20px}
        @media(max-width:768px){.content-grid{grid-template-columns:1fr!important}}
      `}</style>

      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(7,7,13,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 16px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 800, fontSize: '1rem', color: '#FAFAFA' }}>Simulado<span style={{ color: '#818CF8' }}>IA</span></span>
        {!mostrarSelecao && !videoAtivo ? (
          <button onClick={voltarParaSelecao} className="tap" style={{ fontSize: '0.78rem', color: '#52525B', background: 'none', border: 'none', cursor: 'pointer' }}>← Mudar matéria</button>
        ) : videoAtivo ? (
          <button onClick={() => setVideoAtivo(null)} className="tap" style={{ fontSize: '0.78rem', color: '#52525B', background: 'none', border: 'none', cursor: 'pointer' }}>← Voltar</button>
        ) : (
          <Link href="/dashboard"><span style={{ fontSize: '0.78rem', color: '#52525B' }}>← Voltar</span></Link>
        )}
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 16px 80px' }}>

        <div className="content-grid">

          {/* SIDEBAR — seletor de área/tópico — só mostra quando NÃO escolheu área (mobile) ou sempre (desktop via CSS) */}
          {mostrarSelecao && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FAFAFA', marginBottom: 4 }}>🎬 Videoaulas</h1>
                <p style={{ fontSize: '0.75rem', color: '#52525B' }}>Curadoria dos melhores canais do YouTube para o ENEM.</p>
              </div>

              {/* RECOMENDADO — pior área */}
              {piorArea && (
                <div style={{ ...card, padding: '12px 14px', marginBottom: 14, background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.15)' }}>
                  <div style={{ fontSize: '0.6rem', color: '#F87171', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 8 }}>⚠️ Seu maior gap</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FAFAFA', marginBottom: 4 }}>{piorArea.area}</div>
                  <div style={{ fontSize: '0.7rem', color: '#52525B', marginBottom: 10 }}>{Math.round(piorArea.percentual)}% de acerto — precisa reforçar</div>
                  <button onClick={() => selecionar(piorArea.area, '')} className="tap"
                    style={{ width: '100%', padding: '8px', borderRadius: 8, fontWeight: 700, fontSize: '0.75rem', border: 'none', cursor: 'pointer', background: 'rgba(248,113,113,0.15)', color: '#F87171' }}>
                    Ver videoaulas de {piorArea.area.split(' ')[0]} →
                  </button>
                </div>
              )}

              {/* ÁREAS E TÓPICOS */}
              {AREAS_TOPICOS.map(a => (
                <div key={a.area} style={{ marginBottom: 8 }}>
                  <button onClick={() => setAreaSel(a.area)} className="tap"
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 12, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer' }}>
                    <span style={{ fontSize: '1.2rem' }}>{a.icon}</span>
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#E4E4E7' }}>{a.area}</span>
                    <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#3F3F46' }}>{a.topicos.length} tópicos</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* SELEÇÃO DE TÓPICOS — quando escolheu área mas ainda não buscou */}
          {areaSel && !topicoSel && !loading && videos.length === 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <span style={{ fontSize: '1.6rem' }}>{areaAtual?.icon}</span>
                <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FAFAFA' }}>{areaSel}</h1>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#52525B', marginBottom: 14 }}>Escolha um tópico específico ou veja conteúdo geral da matéria.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={() => selecionar(areaSel, '')} className="tap"
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 12, textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', cursor: 'pointer' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#818CF8' }}>🔀 Conteúdo geral de {areaSel}</span>
                  <span style={{ color: '#818CF8' }}>→</span>
                </button>
                {areaAtual?.topicos.map(t => (
                  <button key={t} onClick={() => selecionar(areaSel, t)} className="tap"
                    style={{ width: '100%', padding: '12px 16px', borderRadius: 12, textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#E4E4E7' }}>{t}</span>
                    <span style={{ color: '#3F3F46' }}>→</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CONTEÚDO PRINCIPAL — resultados/player */}
          {(loading || videos.length > 0 || videoAtivo) && (
            <div>
              {/* PLAYER */}
              {videoAtivo && (
                <div>
                  <div style={{ borderRadius: 16, overflow: 'hidden', background: '#000', aspectRatio: '16/9' }}>
                    <iframe
                      src={`${videoAtivo.embedUrl}?autoplay=1`}
                      style={{ width: '100%', height: '100%', border: 'none' }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                  <div style={{ marginTop: 14 }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#FAFAFA', marginBottom: 4 }}>{videoAtivo.titulo}</h2>
                    <p style={{ fontSize: '0.75rem', color: '#52525B' }}>{videoAtivo.canal}</p>
                  </div>
                  <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <Link href="/simulado">
                      <button className="tap" style={{ padding: '10px 18px', borderRadius: 10, fontWeight: 700, fontSize: '0.82rem', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#6366F1,#818CF8)', color: '#fff' }}>
                        🚀 Praticar com simulado
                      </button>
                    </Link>
                    <Link href="/revisao">
                      <button className="tap" style={{ padding: '10px 18px', borderRadius: 10, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: '#E4E4E7' }}>
                        🔄 Revisar questões
                      </button>
                    </Link>
                  </div>
                </div>
              )}

              {/* LOADING */}
              {loading && !videoAtivo && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 14 }}>
                  <div style={{ width: 36, height: 36, border: '3px solid rgba(99,102,241,0.3)', borderTop: '3px solid #6366F1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: '0.82rem', color: '#52525B' }}>Buscando melhores videoaulas...</span>
                  <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                </div>
              )}

              {/* GRID DE VÍDEOS */}
              {!loading && !videoAtivo && videos.length > 0 && (
                <>
                  <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FAFAFA', marginBottom: 2 }}>
                        {topicoSel === 'todos' || !topicoSel ? areaSel : topicoSel}
                      </h2>
                      <p style={{ fontSize: '0.72rem', color: '#52525B' }}>{videos.length} videoaulas encontradas</p>
                    </div>
                    <button onClick={() => { setTopicoSel(''); setVideos([]) }} className="tap"
                      style={{ fontSize: '0.7rem', color: '#52525B', background: 'none', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      Trocar tópico
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                    {videos.map(v => (
                      <button key={v.videoId} onClick={() => setVideoAtivo(v)} className="tap hover-card"
                        style={{ textAlign: 'left', borderRadius: 14, overflow: 'hidden', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', transition: 'all .2s' }}>
                        <div style={{ aspectRatio: '16/9', overflow: 'hidden', background: '#000', position: 'relative' }}>
                          <img src={v.thumbnail} alt={v.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
                            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontSize: '1.2rem', marginLeft: 3 }}>▶</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ padding: '12px 14px' }}>
                          <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#E4E4E7', margin: '0 0 6px', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {v.titulo}
                          </p>
                          <p style={{ fontSize: '0.68rem', color: '#52525B', margin: 0 }}>{v.canal}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {!loading && !videoAtivo && areaSel && topicoSel && videos.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 12 }}>🔍</div>
                  <p style={{ fontSize: '0.85rem', color: '#52525B', marginBottom: 16 }}>Nenhum vídeo encontrado. Tente outro tópico.</p>
                  <button onClick={() => { setTopicoSel(''); setVideos([]) }} className="tap"
                    style={{ padding: '10px 20px', borderRadius: 10, fontWeight: 700, fontSize: '0.82rem', border: 'none', cursor: 'pointer', background: 'rgba(99,102,241,0.1)', color: '#818CF8' }}>
                    Escolher outro tópico
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
