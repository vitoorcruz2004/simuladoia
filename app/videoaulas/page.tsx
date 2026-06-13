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

      // Se veio com parâmetros (da revisão)
      const params = new URLSearchParams(window.location.search)
      const area = params.get('area')
      const topico = params.get('topico')
      if (area) { setAreaSel(area); if (topico) { setTopicoSel(topico); buscarVideos(area, topico) } }
    }
    load()
  }, [])

  async function buscarVideos(area: string, topico: string) {
    setLoading(true)
    setVideoAtivo(null)
    try {
      const res = await fetch(`/api/videoaulas?area=${encodeURIComponent(area)}&topico=${encodeURIComponent(topico)}`)
      const data = await res.json()
      setVideos(data.videos || [])
    } catch { setVideos([]) }
    setLoading(false)
  }

  function selecionar(area: string, topico: string) {
    setAreaSel(area); setTopicoSel(topico)
    buscarVideos(area, topico)
  }

  const bg = '#07070d'
  const card: React.CSSProperties = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16 }
  const areaAtual = AREAS_TOPICOS.find(a => a.area === areaSel)
  const piorArea = desempenho[0]

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: 'Plus Jakarta Sans,sans-serif' }}>
      <style>{`*{box-sizing:border-box} .tap{-webkit-tap-highlight-color:transparent;cursor:pointer;transition:all .15s} .tap:active{opacity:.7;transform:scale(.97)} a{text-decoration:none;color:inherit} .hover-card:hover{border-color:rgba(99,102,241,0.3)!important;background:rgba(99,102,241,0.04)!important}`}</style>

      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(7,7,13,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 16px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 800, fontSize: '1rem', color: '#FAFAFA' }}>Simulado<span style={{ color: '#818CF8' }}>IA</span></span>
        <Link href="/dashboard"><span style={{ fontSize: '0.78rem', color: '#52525B' }}>← Voltar</span></Link>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px 80px', display: 'grid', gridTemplateColumns: videoAtivo ? '1fr' : '280px 1fr', gap: 20 }}>

        {/* SIDEBAR — seletor de área/tópico */}
        {!videoAtivo && (
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
              <div key={a.area} style={{ marginBottom: 12 }}>
                <button onClick={() => selecionar(a.area, '')} className="tap"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, background: areaSel === a.area && !topicoSel ? `rgba(${parseInt(a.cor.slice(1,3),16)},${parseInt(a.cor.slice(3,5),16)},${parseInt(a.cor.slice(5,7),16)},0.12)` : 'rgba(255,255,255,0.03)', border: `1px solid ${areaSel === a.area && !topicoSel ? a.cor + '44' : 'rgba(255,255,255,0.07)'}`, cursor: 'pointer', marginBottom: 4 }}>
                  <span style={{ fontSize: '1rem' }}>{a.icon}</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: areaSel === a.area ? a.cor : '#A1A1AA' }}>{a.area}</span>
                </button>
                {areaSel === a.area && (
                  <div style={{ paddingLeft: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {a.topicos.map(t => (
                      <button key={t} onClick={() => selecionar(a.area, t)} className="tap"
                        style={{ width: '100%', padding: '7px 10px', borderRadius: 8, textAlign: 'left', fontSize: '0.78rem', fontWeight: topicoSel === t ? 700 : 500, color: topicoSel === t ? a.cor : '#71717A', background: topicoSel === t ? `rgba(${parseInt(a.cor.slice(1,3),16)},${parseInt(a.cor.slice(3,5),16)},${parseInt(a.cor.slice(5,7),16)},0.1)` : 'transparent', border: 'none', cursor: 'pointer' }}>
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* CONTEÚDO PRINCIPAL */}
        <div>
          {/* PLAYER */}
          {videoAtivo && (
            <div style={{ marginBottom: 20 }}>
              <button onClick={() => setVideoAtivo(null)} className="tap"
                style={{ fontSize: '0.78rem', color: '#52525B', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 12 }}>
                ← Voltar para resultados
              </button>
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
              <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
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

          {/* LISTA DE VÍDEOS */}
          {!videoAtivo && (
            <>
              {!areaSel && (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <div style={{ fontSize: '3rem', marginBottom: 16 }}>🎬</div>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FAFAFA', marginBottom: 8 }}>Escolha uma matéria</h2>
                  <p style={{ fontSize: '0.82rem', color: '#52525B' }}>Selecione a área ou tópico ao lado para ver videoaulas recomendadas.</p>
                </div>
              )}

              {loading && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 14 }}>
                  <div style={{ width: 36, height: 36, border: '3px solid rgba(99,102,241,0.3)', borderTop: '3px solid #6366F1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: '0.82rem', color: '#52525B' }}>Buscando melhores videoaulas...</span>
                  <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                </div>
              )}

              {!loading && areaSel && videos.length > 0 && (
                <>
                  <div style={{ marginBottom: 20 }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FAFAFA', marginBottom: 4 }}>
                      {topicoSel || areaSel}
                    </h2>
                    <p style={{ fontSize: '0.75rem', color: '#52525B' }}>{videos.length} videoaulas encontradas</p>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
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

              {!loading && areaSel && videos.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 12 }}>🔍</div>
                  <p style={{ fontSize: '0.85rem', color: '#52525B' }}>Nenhum vídeo encontrado. Tente outro tópico.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
