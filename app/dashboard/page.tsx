'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { BADGES, comprarStreakFreeze } from '@/lib/gamificacao'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Desempenho { area: string; percentual: number; total_respondidas: number }
interface Simulado { id: string; created_at: string; percentual: number; total_questoes: number; acertos: number }
interface Gam { pontos: number; streak_atual: number; streak_maximo: number; total_simulados: number; badges: string[]; meta_diaria: number; questoes_hoje: number; streak_freeze: number }

const AREA_COLORS: Record<string, string> = {
  'Matemática': '#818CF8', 'Linguagens': '#34D399',
  'Ciências Humanas': '#FBBF24', 'Ciências da Natureza': '#60A5FA',
}
const AREA_ICONS: Record<string, string> = {
  'Matemática': '📐', 'Linguagens': '📝',
  'Ciências Humanas': '🌍', 'Ciências da Natureza': '🔬',
}

const NAV_ITEMS = [
  { href: '/simulado', icon: '🚀', label: 'Simulado', primary: true },
  { href: '/redacao', icon: '✍️', label: 'Redação' },
  { href: '/flashcards', icon: '⚡', label: 'Flashcards' },
  { href: '/plano', icon: '📅', label: 'Plano de estudos' },
  { href: '/revisao', icon: '🔄', label: 'Revisão', badge: true },
  { href: '/sisu', icon: '🎓', label: 'Simulador SiSU' },
  { href: '/leaderboard', icon: '🏆', label: 'Ranking' },
  { href: '/amigos', icon: '👥', label: 'Amigos' },
]

function CircleProgress({ pct, size = 60, stroke = 5, color = '#6366F1', children }: any) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [desempenho, setDesempenho] = useState<Desempenho[]>([])
  const [simulados, setSimulados] = useState<Simulado[]>([])
  const [gam, setGam] = useState<Gam | null>(null)
  const [totalErradas, setTotalErradas] = useState(0)
  const [loading, setLoading] = useState(true)
  const [comprando, setComprando] = useState(false)
  const [freezeMsg, setFreezeMsg] = useState('')
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      setUser(user)
      const [{ data: prof }, { data: desemp }, { data: sims }, { data: g }, { data: erradas }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('desempenho').select('*').eq('user_id', user.id).order('percentual'),
        supabase.from('simulados').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('gamificacao').select('*').eq('user_id', user.id).single(),
        supabase.from('questoes_erradas').select('id').eq('user_id', user.id),
      ])
      setProfile(prof); setDesempenho(desemp || []); setSimulados(sims || [])
      setGam(g || null); setTotalErradas(erradas?.length || 0); setLoading(false)
    }
    load()
  }, [])

  async function handleFreeze() {
    if (!user || comprando) return
    setComprando(true)
    const ok = await comprarStreakFreeze(user.id)
    if (ok) { setFreezeMsg('✓ Freeze ativado!'); const { data: g } = await supabase.from('gamificacao').select('*').eq('user_id', user.id).single(); setGam(g) }
    else setFreezeMsg('Precisa de 50 pts')
    setComprando(false); setTimeout(() => setFreezeMsg(''), 3000)
  }

  async function sair() { await supabase.auth.signOut(); router.push('/auth') }

  const notaGeral = desempenho.length ? Math.round(desempenho.reduce((a, d) => a + d.percentual, 0) / desempenho.length) : 0
  const totalQuestoes = desempenho.reduce((a, d) => a + d.total_respondidas, 0)
  const piorArea = desempenho[0]
  const badgesOk = gam ? BADGES.filter(b => gam.badges?.includes(b.id)) : []
  const metaPct = gam ? Math.min(100, Math.round(((gam.questoes_hoje || 0) / (gam.meta_diaria || 10)) * 100)) : 0
  const metaOk = gam && (gam.questoes_hoje || 0) >= (gam.meta_diaria || 10)
  const nome = profile?.nome?.split(' ')[0] || user?.email?.split('@')[0] || 'Estudante'
  const cor = (n: number) => n >= 70 ? '#34D399' : n >= 50 ? '#FBBF24' : '#F87171'

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#07070d' }}>
      <div style={{ width: 32, height: 32, border: '3px solid rgba(99,102,241,0.3)', borderTop: '3px solid #6366F1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const card: React.CSSProperties = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16 }

  return (
    <div style={{ minHeight: '100vh', background: '#07070d', fontFamily: 'Plus Jakarta Sans,sans-serif' }}>
      <style>{`
        *{box-sizing:border-box}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes up{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .u{animation:up .35s ease both}
        .tap{-webkit-tap-highlight-color:transparent;cursor:pointer;transition:all .15s}
        .tap:active{opacity:.7;transform:scale(.97)}
        .nav-item{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;font-size:.85rem;font-weight:600;color:#71717A;cursor:pointer;transition:all .15s;text-decoration:none;white-space:nowrap}
        .nav-item:hover{background:rgba(255,255,255,0.05);color:#E4E4E7}
        .nav-item.primary{background:linear-gradient(135deg,#6366F1,#818CF8);color:#fff;box-shadow:0 4px 16px rgba(99,102,241,0.3);margin-bottom:4px}
        .nav-item.primary:hover{filter:brightness(1.1)}
        a{text-decoration:none;color:inherit}
        
        /* DESKTOP LAYOUT */
        .layout{display:flex;min-height:100vh}
        .sidebar{width:220px;min-height:100vh;position:fixed;top:0;left:0;bottom:0;background:rgba(255,255,255,0.02);border-right:1px solid rgba(255,255,255,0.06);display:flex;flex-direction:column;padding:20px 12px;z-index:100}
        .main{margin-left:220px;flex:1;padding:28px 32px 60px}
        .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        
        /* MOBILE LAYOUT */
        @media(max-width:768px){
          .sidebar{display:none}
          .main{margin-left:0;padding:60px 14px 100px}
          .grid-2{grid-template-columns:1fr}
          .mobile-nav{display:flex!important}
        }
        @media(min-width:769px){
          .mobile-nav{display:none!important}
          .mobile-header{display:none!important}
        }
      `}</style>

      {/* SIDEBAR — desktop only */}
      <div className="sidebar">
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.03em', color: '#FAFAFA', marginBottom: 4 }}>
            Simulado<span style={{ color: '#818CF8' }}>IA</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#52525B' }}>{nome}</div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          {NAV_ITEMS.map(item => (
            <Link key={item.href} href={item.href} className={`nav-item${item.primary ? ' primary' : ''}`}>
              <span style={{ fontSize: '1rem' }}>{item.icon}</span>
              <span>{item.label}</span>
              {item.badge && totalErradas > 0 && (
                <span style={{ marginLeft: 'auto', background: '#FBBF24', color: '#000', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 800 }}>
                  {totalErradas}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16, marginTop: 16 }}>
          {gam && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: '1rem' }}>{gam.streak_atual >= 3 ? '🔥' : '⚡'}</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: gam.streak_atual >= 3 ? '#f59e0b' : '#FAFAFA' }}>
                  {gam.streak_atual} dias
                </span>
                <span style={{ fontSize: '0.7rem', color: '#52525B', marginLeft: 'auto' }}>⚡{gam.pontos}pts</span>
              </div>
              <div style={{ height: 4, borderRadius: 100, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 100, width: `${metaPct}%`, background: metaOk ? '#34D399' : '#6366F1', transition: 'width 1s ease' }} />
              </div>
              <div style={{ fontSize: '0.62rem', color: '#52525B', marginTop: 4 }}>
                {metaOk ? '✓ Meta do dia concluída' : `${gam.questoes_hoje || 0}/${gam.meta_diaria || 10} questões hoje`}
              </div>
            </div>
          )}
          <button onClick={sair} className="tap"
            style={{ width: '100%', padding: '8px', borderRadius: 8, fontSize: '0.75rem', color: '#52525B', background: 'none', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
            Sair
          </button>
        </div>
      </div>

      {/* MOBILE HEADER */}
      <div className="mobile-header" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(7,7,13,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 16px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 800, fontSize: '1rem', color: '#FAFAFA' }}>Simulado<span style={{ color: '#818CF8' }}>IA</span></span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#6366F1,#818CF8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 800, color: '#fff' }}>
            {nome[0].toUpperCase()}
          </div>
          <button onClick={sair} className="tap" style={{ fontSize: '0.72rem', color: '#52525B', background: 'none', border: 'none', cursor: 'pointer' }}>Sair</button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="main">

        {/* HEADER */}
        <div className="u" style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#FAFAFA' }}>
            Olá, {nome} 👋
          </h1>
          <p style={{ color: '#52525B', fontSize: '0.82rem', marginTop: 3 }}>
            {totalQuestoes === 0 ? 'Faça seu primeiro simulado agora.' : `${totalQuestoes} questões respondidas · continue!`}
          </p>
        </div>

        {/* STREAK HERO — só no desktop fica no topo */}
        {gam && (
          <div className="u" style={{ ...card, padding: '20px 24px', marginBottom: 20, background: gam.streak_atual >= 3 ? 'linear-gradient(135deg,rgba(245,158,11,0.1),rgba(239,68,68,0.05))' : 'rgba(255,255,255,0.03)', border: gam.streak_atual >= 3 ? '1px solid rgba(245,158,11,0.25)' : '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <CircleProgress pct={Math.min(100, gam.streak_atual * 3.3)} size={64} stroke={5} color={gam.streak_atual >= 7 ? '#f59e0b' : gam.streak_atual >= 3 ? '#fb923c' : '#6366F1'}>
                  <span style={{ fontSize: '1.3rem' }}>{gam.streak_atual >= 3 ? '🔥' : '⚡'}</span>
                </CircleProgress>
                <div>
                  <div style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1, color: gam.streak_atual >= 3 ? '#f59e0b' : '#FAFAFA' }}>
                    {gam.streak_atual}<span style={{ fontSize: '0.9rem', fontWeight: 400, color: '#52525B', marginLeft: 6 }}>dias seguidos</span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#52525B', marginTop: 3 }}>
                    🏆 Recorde: {gam.streak_maximo} · ⚡ {gam.pontos} pts{gam.streak_freeze > 0 && <span style={{ color: '#818CF8' }}> · 🛡️{gam.streak_freeze}</span>}
                  </div>
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: 7 }}>
                  <span style={{ color: '#52525B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Meta diária</span>
                  <span style={{ color: metaOk ? '#34D399' : '#FAFAFA', fontWeight: 700 }}>
                    {metaOk ? '✓ Concluída!' : `${gam.questoes_hoje || 0}/${gam.meta_diaria || 10}`}
                  </span>
                </div>
                <div style={{ height: 7, borderRadius: 100, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 100, width: `${metaPct}%`, transition: 'width 1s ease', background: metaOk ? 'linear-gradient(90deg,#34D399,#059669)' : 'linear-gradient(90deg,#6366F1,#818CF8)' }} />
                </div>
              </div>

              <button onClick={handleFreeze} disabled={comprando || (gam.pontos < 50)} className="tap"
                style={{ fontSize: '0.72rem', padding: '8px 14px', borderRadius: 10, whiteSpace: 'nowrap', background: gam.pontos >= 50 ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)', color: gam.pontos >= 50 ? '#818CF8' : '#3F3F46', border: `1px solid ${gam.pontos >= 50 ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.05)'}`, cursor: gam.pontos >= 50 ? 'pointer' : 'default' }}>
                🛡️ Freeze (50pts)
              </button>
            </div>
            {freezeMsg && <div style={{ fontSize: '0.72rem', color: '#818CF8', marginTop: 10, textAlign: 'center' }}>{freezeMsg}</div>}
          </div>
        )}

        {/* GRID PRINCIPAL */}
        <div className="grid-2">

          {/* COLUNA ESQUERDA */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* STATS */}
            <div className="u" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {[
                { l: 'Aproveitamento', v: `${notaGeral}%`, s: notaGeral >= 70 ? 'Excelente' : notaGeral >= 50 ? 'Evoluindo' : 'Treinar', c: cor(notaGeral) },
                { l: 'Simulados', v: String(simulados.length), s: `${totalQuestoes} questões`, c: '#818CF8' },
                { l: 'Maior gap', v: piorArea ? AREA_ICONS[piorArea.area] : '—', s: piorArea ? piorArea.area.split(' ').pop() || '' : 'Sem dados', c: '#F87171' },
              ].map((s, i) => (
                <div key={i} style={{ ...card, padding: '14px 12px' }}>
                  <div style={{ fontSize: '0.58rem', color: '#3F3F46', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 8 }}>{s.l}</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.03em', color: s.c, lineHeight: 1 }}>{s.v}</div>
                  <div style={{ fontSize: '0.65rem', color: '#52525B', marginTop: 5 }}>{s.s}</div>
                </div>
              ))}
            </div>

            {/* DESEMPENHO */}
            {desempenho.length > 0 && (
              <div className="u" style={{ ...card, padding: '18px 20px' }}>
                <div style={{ fontSize: '0.62rem', color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 16 }}>Desempenho por área</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {desempenho.map(d => {
                    const c = AREA_COLORS[d.area] || '#818CF8'
                    return (
                      <div key={d.area}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <span style={{ fontSize: '0.9rem' }}>{AREA_ICONS[d.area]}</span>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#E4E4E7' }}>{d.area}</span>
                          </div>
                          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: c }}>{Math.round(d.percentual)}%</span>
                        </div>
                        <div style={{ height: 5, borderRadius: 100, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 100, background: c, width: `${d.percentual}%`, transition: 'width 1s ease' }} />
                        </div>
                        <div style={{ fontSize: '0.6rem', color: '#3F3F46', marginTop: 3 }}>{d.total_respondidas} questões</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* COLUNA DIREITA */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* AÇÃO RÁPIDA DESKTOP */}
            <div className="u" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Link href="/simulado">
                <button className="tap" style={{ width: '100%', padding: '18px', borderRadius: 14, fontWeight: 800, fontSize: '0.95rem', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#6366F1,#818CF8)', color: '#fff', boxShadow: '0 6px 20px rgba(99,102,241,0.35)' }}>
                  🚀 {totalQuestoes === 0 ? 'Primeiro simulado' : 'Novo simulado'}
                </button>
              </Link>
              <Link href="/redacao">
                <button className="tap" style={{ width: '100%', padding: '18px', borderRadius: 14, fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', color: '#E4E4E7', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}>
                  ✍️ Treinar redação
                </button>
              </Link>
            </div>

            {/* BADGES */}
            {badgesOk.length > 0 && (
              <div className="u" style={{ ...card, padding: '18px 20px' }}>
                <div style={{ fontSize: '0.62rem', color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 14 }}>
                  Conquistas ({badgesOk.length}/{BADGES.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {badgesOk.map(b => (
                    <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 100, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                      <span style={{ fontSize: '0.85rem' }}>{b.emoji}</span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#818CF8' }}>{b.nome}</span>
                    </div>
                  ))}
                  {BADGES.filter(b => !gam?.badges?.includes(b.id)).slice(0, 2).map(b => (
                    <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 100, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', opacity: 0.35 }}>
                      <span style={{ fontSize: '0.85rem', filter: 'grayscale(1)' }}>{b.emoji}</span>
                      <span style={{ fontSize: '0.7rem', color: '#52525B' }}>{b.nome}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* HISTÓRICO */}
            {simulados.length > 0 && (
              <div className="u" style={{ ...card, padding: '18px 20px' }}>
                <div style={{ fontSize: '0.62rem', color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 14 }}>Últimos simulados</div>
                {simulados.map((s, i) => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: i < simulados.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                    <div>
                      <div style={{ fontSize: '0.82rem', color: '#A1A1AA', fontWeight: 500 }}>{s.total_questoes} questões</div>
                      <div style={{ fontSize: '0.63rem', color: '#3F3F46', marginTop: 2 }}>{new Date(s.created_at).toLocaleDateString('pt-BR')}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: cor(s.percentual) }}>{Math.round(s.percentual)}%</div>
                      <div style={{ fontSize: '0.6rem', color: '#3F3F46' }}>{s.acertos}/{s.total_questoes}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* MOBILE ACTIONS — só no mobile */}
        <div className="mobile-nav" style={{ display: 'none', flexDirection: 'column', gap: 10, marginTop: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Link href="/simulado">
              <button className="tap" style={{ width: '100%', padding: '16px', borderRadius: 14, fontWeight: 800, fontSize: '0.88rem', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#6366F1,#818CF8)', color: '#fff', boxShadow: '0 6px 20px rgba(99,102,241,0.35)' }}>
                🚀 {totalQuestoes === 0 ? 'Primeiro simulado' : 'Novo simulado'}
              </button>
            </Link>
            <Link href="/redacao">
              <button className="tap" style={{ width: '100%', padding: '16px', borderRadius: 14, fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', color: '#E4E4E7', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}>
                ✍️ Redação
              </button>
            </Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
            {[
              { href: '/revisao', icon: '🔄', label: 'Revisão', badge: totalErradas > 0 ? totalErradas : null },
              { href: '/flashcards', icon: '⚡', label: 'Flashcards' },
              { href: '/plano', icon: '📅', label: 'Plano' },
              { href: '/leaderboard', icon: '🏆', label: 'Ranking' },
            ].map(a => (
              <Link key={a.href} href={a.href}>
                <button className="tap" style={{ width: '100%', padding: '12px 5px', borderRadius: 13, position: 'relative', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: '#71717A', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}>
                  <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>{a.icon}</div>
                  {a.label}
                  {a.badge && <div style={{ position: 'absolute', top: 5, right: 5, width: 16, height: 16, borderRadius: '50%', background: '#FBBF24', color: '#000', fontSize: '0.55rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{a.badge}</div>}
                </button>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
