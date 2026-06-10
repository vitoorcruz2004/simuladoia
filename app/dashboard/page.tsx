'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { BADGES, comprarStreakFreeze } from '@/lib/gamificacao'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Desempenho { area: string; percentual: number; total_respondidas: number }
interface Simulado { id: string; created_at: string; percentual: number; total_questoes: number; acertos: number }
interface Gam { pontos: number; streak_atual: number; streak_maximo: number; total_simulados: number; total_redacoes: number; badges: string[]; meta_diaria: number; questoes_hoje: number; streak_freeze: number }

const AREA_COLORS: Record<string, {solid: string; bg: string}> = {
  'Matemática':         { solid: '#818CF8', bg: 'rgba(129,140,248,0.12)' },
  'Linguagens':         { solid: '#34D399', bg: 'rgba(52,211,153,0.12)' },
  'Ciências Humanas':   { solid: '#FBBF24', bg: 'rgba(251,191,36,0.12)' },
  'Ciências da Natureza': { solid: '#60A5FA', bg: 'rgba(96,165,250,0.12)' },
}

const AREA_ICONS: Record<string, string> = {
  'Matemática': '📐', 'Linguagens': '📝',
  'Ciências Humanas': '🌍', 'Ciências da Natureza': '🔬',
}

function CircleProgress({ pct, size = 72, stroke = 6, color = '#6366F1', children }: any) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
          strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
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
      setProfile(prof)
      setDesempenho(desemp || [])
      setSimulados(sims || [])
      setGam(g || null)
      setTotalErradas(erradas?.length || 0)
      setLoading(false)
    }
    load()
  }, [])

  async function handleFreeze() {
    if (!user || comprando) return
    setComprando(true)
    const { comprarStreakFreeze: fn } = await import('@/lib/gamificacao')
    const ok = await fn(user.id)
    if (ok) {
      setFreezeMsg('✓ Streak Freeze ativado!')
      const { data: g } = await supabase.from('gamificacao').select('*').eq('user_id', user.id).single()
      setGam(g)
    } else setFreezeMsg('Pontos insuficientes (50 pts)')
    setComprando(false)
    setTimeout(() => setFreezeMsg(''), 3000)
  }

  async function sair() { await supabase.auth.signOut(); router.push('/auth') }

  const notaGeral = desempenho.length ? Math.round(desempenho.reduce((a, d) => a + d.percentual, 0) / desempenho.length) : 0
  const totalQuestoes = desempenho.reduce((a, d) => a + d.total_respondidas, 0)
  const piorArea = desempenho[0]
  const badgesOk = gam ? BADGES.filter(b => gam.badges?.includes(b.id)) : []
  const metaPct = gam ? Math.min(100, Math.round(((gam.questoes_hoje || 0) / (gam.meta_diaria || 10)) * 100)) : 0
  const metaOk = gam && (gam.questoes_hoje || 0) >= (gam.meta_diaria || 10)
  const primeiroNome = profile?.nome?.split(' ')[0] || user?.email?.split('@')[0] || 'Estudante'

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'#07070d'}}>
      <div className="flex flex-col items-center gap-3">
        <div style={{width:40,height:40,border:'3px solid rgba(99,102,241,0.3)',borderTop:'3px solid #6366F1',borderRadius:'50%',animation:'spin 1s linear infinite'}}/>
        <span className="text-zinc-500 text-sm">Carregando seu painel...</span>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div className="min-h-screen" style={{background:'#07070d'}}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .card{animation:fadeUp .4s ease both}
        .card:nth-child(1){animation-delay:.05s}
        .card:nth-child(2){animation-delay:.1s}
        .card:nth-child(3){animation-delay:.15s}
        .card:nth-child(4){animation-delay:.2s}
        .card:nth-child(5){animation-delay:.25s}
        .btn-action:hover{filter:brightness(1.1);transform:translateY(-1px)}
        .btn-action{transition:all .2s ease}
        .area-card:hover{border-color:rgba(99,102,241,0.3)!important;background:#0f0f1a!important}
        .area-card{transition:all .2s ease}
      `}</style>

      {/* NAV */}
      <nav style={{background:'rgba(7,7,13,0.9)',backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(255,255,255,0.06)',position:'sticky',top:0,zIndex:100}}>
        <div style={{maxWidth:1100,margin:'0 auto',padding:'0 32px',height:60,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{fontWeight:800,fontSize:'1.1rem',letterSpacing:'-0.03em'}}>
            Simulado<span style={{color:'#818CF8'}}>IA</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:16}}>
            <div style={{width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,#6366F1,#818CF8)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.75rem',fontWeight:700,color:'#fff'}}>
              {primeiroNome[0].toUpperCase()}
            </div>
            <span style={{fontSize:'0.8rem',color:'#52525B'}}>{primeiroNome}</span>
            <button onClick={sair} style={{fontSize:'0.75rem',color:'#52525B',background:'none',border:'none',cursor:'pointer',transition:'color .2s'}}
              onMouseOver={e => (e.target as any).style.color='#a1a1aa'}
              onMouseOut={e => (e.target as any).style.color='#52525B'}>
              Sair
            </button>
          </div>
        </div>
      </nav>

      <div style={{maxWidth:1100,margin:'0 auto',padding:'32px 32px 80px'}}>

        {/* HEADER */}
        <div className="card" style={{marginBottom:32}}>
          <h1 style={{fontSize:'1.6rem',fontWeight:800,letterSpacing:'-0.03em',color:'#FAFAFA'}}>
            Olá, {primeiroNome} 👋
          </h1>
          <p style={{color:'#52525B',fontSize:'0.85rem',marginTop:4}}>
            {totalQuestoes === 0 ? 'Faça seu primeiro simulado para começar seu diagnóstico.' : `${totalQuestoes} questões respondidas · continue assim!`}
          </p>
        </div>

        {/* STREAK + META HERO */}
        {gam && (
          <div className="card" style={{
            marginBottom:20,padding:'24px 28px',borderRadius:20,
            background: gam.streak_atual >= 3
              ? 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(239,68,68,0.06) 100%)'
              : 'rgba(255,255,255,0.03)',
            border: gam.streak_atual >= 3 ? '1px solid rgba(245,158,11,0.25)' : '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:24,flexWrap:'wrap'}}>

              {/* STREAK */}
              <div style={{display:'flex',alignItems:'center',gap:20}}>
                <CircleProgress pct={Math.min(100, gam.streak_atual * 3.3)} size={80} stroke={7}
                  color={gam.streak_atual >= 7 ? '#f59e0b' : gam.streak_atual >= 3 ? '#fb923c' : '#6366F1'}>
                  <span style={{fontSize:'1.5rem'}}>{gam.streak_atual >= 3 ? '🔥' : '⚡'}</span>
                </CircleProgress>
                <div>
                  <div style={{fontSize:'2.4rem',fontWeight:900,letterSpacing:'-0.04em',lineHeight:1,
                    color: gam.streak_atual >= 3 ? '#f59e0b' : '#FAFAFA'}}>
                    {gam.streak_atual}
                    <span style={{fontSize:'1rem',fontWeight:400,color:'#52525B',marginLeft:6}}>dias seguidos</span>
                  </div>
                  <div style={{fontSize:'0.75rem',color:'#52525B',marginTop:4}}>
                    🏆 Recorde: {gam.streak_maximo} dias &nbsp;·&nbsp; ⚡ {gam.pontos} pontos
                  </div>
                  {gam.streak_freeze > 0 && (
                    <div style={{fontSize:'0.72rem',color:'#818CF8',marginTop:4}}>🛡️ {gam.streak_freeze}x Streak Freeze ativo</div>
                  )}
                </div>
              </div>

              {/* META DIÁRIA */}
              <div style={{flex:1,minWidth:200,maxWidth:320}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.75rem',marginBottom:8}}>
                  <span style={{color:'#71717A',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.08em'}}>Meta diária</span>
                  <span style={{color: metaOk ? '#34D399' : '#FAFAFA',fontWeight:700}}>
                    {metaOk ? '✓ Concluída!' : `${gam.questoes_hoje || 0}/${gam.meta_diaria || 10} questões`}
                  </span>
                </div>
                <div style={{height:8,borderRadius:100,background:'rgba(255,255,255,0.06)',overflow:'hidden'}}>
                  <div style={{height:'100%',borderRadius:100,transition:'width 1s ease',
                    background: metaOk ? 'linear-gradient(90deg,#34D399,#059669)' : 'linear-gradient(90deg,#6366F1,#818CF8)',
                    width:`${metaPct}%`}}/>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',marginTop:12,gap:8}}>
                  <button onClick={handleFreeze} disabled={comprando || (gam.pontos < 50)}
                    style={{fontSize:'0.7rem',padding:'5px 12px',borderRadius:8,cursor: gam.pontos >= 50 ? 'pointer' : 'not-allowed',
                      background: gam.pontos >= 50 ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.04)',
                      color: gam.pontos >= 50 ? '#818CF8' : '#3F3F46',
                      border: `1px solid ${gam.pontos >= 50 ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.06)'}`,
                      transition:'all .2s'}}>
                    🛡️ Freeze (50 pts)
                  </button>
                  {freezeMsg && <span style={{fontSize:'0.7rem',color:'#818CF8',alignSelf:'center'}}>{freezeMsg}</span>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STATS GRID */}
        <div className="card" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:20}}>
          {[
            { label:'Aproveitamento', value: `${notaGeral}%`, sub: notaGeral === 0 ? 'Sem dados' : notaGeral >= 70 ? 'Excelente!' : notaGeral >= 50 ? 'Em evolução' : 'Precisa treinar',
              color: notaGeral >= 70 ? '#34D399' : notaGeral >= 50 ? '#FBBF24' : '#F87171' },
            { label:'Simulados feitos', value: simulados.length.toString(), sub: `${totalQuestoes} questões respondidas`, color:'#818CF8' },
            { label:'Maior gap', value: piorArea ? AREA_ICONS[piorArea.area] || '📌' : '—',
              sub: piorArea ? `${piorArea.area} · ${Math.round(piorArea.percentual)}%` : 'Faça um simulado', color:'#F87171' },
          ].map((s, i) => (
            <div key={i} style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',
              borderRadius:16,padding:'20px 20px 18px'}}>
              <div style={{fontSize:'0.65rem',color:'#52525B',textTransform:'uppercase',letterSpacing:'0.12em',fontWeight:600,marginBottom:10}}>
                {s.label}
              </div>
              <div style={{fontSize: s.label === 'Maior gap' ? '2rem' : '2rem',fontWeight:900,letterSpacing:'-0.03em',color:s.color,lineHeight:1}}>
                {s.value}
              </div>
              <div style={{fontSize:'0.72rem',color:'#52525B',marginTop:6}}>{s.sub}</div>
            </div>
          ))}
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>

          {/* DESEMPENHO POR ÁREA */}
          {desempenho.length > 0 && (
            <div className="card" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:20,padding:24}}>
              <div style={{fontSize:'0.7rem',color:'#52525B',textTransform:'uppercase',letterSpacing:'0.12em',fontWeight:600,marginBottom:20}}>
                Desempenho por área
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:16}}>
                {desempenho.map(d => {
                  const c = AREA_COLORS[d.area] || {solid:'#818CF8',bg:'rgba(129,140,248,0.12)'}
                  return (
                    <div key={d.area} className="area-card" style={{
                      background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.04)',
                      borderRadius:12,padding:'12px 14px',cursor:'default'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <span style={{fontSize:'1rem'}}>{AREA_ICONS[d.area]}</span>
                          <span style={{fontSize:'0.85rem',fontWeight:600,color:'#E4E4E7'}}>{d.area}</span>
                        </div>
                        <span style={{fontSize:'0.9rem',fontWeight:800,color:c.solid}}>{Math.round(d.percentual)}%</span>
                      </div>
                      <div style={{height:5,borderRadius:100,background:'rgba(255,255,255,0.06)',overflow:'hidden'}}>
                        <div style={{height:'100%',borderRadius:100,background:c.solid,width:`${d.percentual}%`,transition:'width 1s ease'}}/>
                      </div>
                      <div style={{fontSize:'0.65rem',color:'#3F3F46',marginTop:5}}>{d.total_respondidas} questões</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* BADGES + HISTÓRICO */}
          <div style={{display:'flex',flexDirection:'column',gap:12}}>

            {/* BADGES */}
            {badgesOk.length > 0 && (
              <div className="card" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:20,padding:24}}>
                <div style={{fontSize:'0.7rem',color:'#52525B',textTransform:'uppercase',letterSpacing:'0.12em',fontWeight:600,marginBottom:16}}>
                  Conquistas ({badgesOk.length}/{BADGES.length})
                </div>
                <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                  {badgesOk.map(b => (
                    <div key={b.id} title={b.descricao} style={{
                      display:'flex',alignItems:'center',gap:6,padding:'6px 12px',borderRadius:100,
                      background:'rgba(99,102,241,0.08)',border:'1px solid rgba(99,102,241,0.18)',cursor:'default'}}>
                      <span style={{fontSize:'1rem'}}>{b.emoji}</span>
                      <span style={{fontSize:'0.72rem',fontWeight:600,color:'#818CF8'}}>{b.nome}</span>
                    </div>
                  ))}
                  {BADGES.filter(b => !gam?.badges?.includes(b.id)).slice(0,3).map(b => (
                    <div key={b.id} title={`Bloqueado: ${b.descricao}`} style={{
                      display:'flex',alignItems:'center',gap:6,padding:'6px 12px',borderRadius:100,
                      background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.05)',cursor:'default',opacity:0.4}}>
                      <span style={{fontSize:'1rem',filter:'grayscale(1)'}}>{b.emoji}</span>
                      <span style={{fontSize:'0.72rem',color:'#52525B'}}>{b.nome}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* HISTÓRICO */}
            {simulados.length > 0 && (
              <div className="card" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:20,padding:24,flex:1}}>
                <div style={{fontSize:'0.7rem',color:'#52525B',textTransform:'uppercase',letterSpacing:'0.12em',fontWeight:600,marginBottom:16}}>
                  Últimos simulados
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:1}}>
                  {simulados.map((s, i) => {
                    const cor = s.percentual >= 70 ? '#34D399' : s.percentual >= 50 ? '#FBBF24' : '#F87171'
                    return (
                      <div key={s.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',
                        padding:'10px 0',borderBottom: i < simulados.length-1 ? '1px solid rgba(255,255,255,0.04)' : 'none'}}>
                        <div>
                          <div style={{fontSize:'0.82rem',color:'#A1A1AA',fontWeight:500}}>{s.total_questoes} questões</div>
                          <div style={{fontSize:'0.68rem',color:'#3F3F46',marginTop:2}}>
                            {new Date(s.created_at).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                        <div style={{textAlign:'right'}}>
                          <div style={{fontSize:'1.1rem',fontWeight:800,color:cor}}>{Math.round(s.percentual)}%</div>
                          <div style={{fontSize:'0.65rem',color:'#3F3F46'}}>{s.acertos}/{s.total_questoes}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* AÇÕES */}
        <div className="card" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
          <Link href="/simulado" style={{textDecoration:'none'}}>
            <button className="btn-action" style={{width:'100%',padding:'16px',borderRadius:16,fontWeight:800,
              fontSize:'0.95rem',cursor:'pointer',border:'none',
              background:'linear-gradient(135deg,#6366F1,#818CF8)',color:'#fff',
              boxShadow:'0 8px 32px rgba(99,102,241,0.3)'}}>
              {totalQuestoes === 0 ? '🚀 Fazer primeiro simulado' : '🚀 Novo simulado'}
            </button>
          </Link>
          <Link href="/redacao" style={{textDecoration:'none'}}>
            <button className="btn-action" style={{width:'100%',padding:'16px',borderRadius:16,fontWeight:700,
              fontSize:'0.95rem',cursor:'pointer',color:'#E4E4E7',
              background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
              ✍️ Treinar redação
            </button>
          </Link>
        </div>
        <div className="card" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
          {[
            { href:'/revisao', icon:'🔄', label:'Revisão', badge: totalErradas > 0 ? totalErradas : null, accent: totalErradas > 0 },
            { href:'/plano', icon:'📅', label:'Plano de estudos', badge: null, accent: false },
            { href:'/sisu', icon:'🎓', label:'Simulador SiSU', badge: null, accent: false },
            { href:'/leaderboard', icon:'🏆', label:'Ranking', badge: null, accent: false },
          ].map(a => (
            <Link key={a.href} href={a.href} style={{textDecoration:'none'}}>
              <button className="btn-action" style={{
                width:'100%',padding:'14px 8px',borderRadius:14,cursor:'pointer',position:'relative',
                background: a.accent ? 'rgba(251,191,36,0.08)' : 'rgba(255,255,255,0.03)',
                border: a.accent ? '1px solid rgba(251,191,36,0.2)' : '1px solid rgba(255,255,255,0.06)',
                color: a.accent ? '#FBBF24' : '#71717A', fontSize:'0.78rem', fontWeight:600}}>
                <div style={{fontSize:'1.3rem',marginBottom:4}}>{a.icon}</div>
                {a.label}
                {a.badge && (
                  <div style={{position:'absolute',top:8,right:8,width:18,height:18,borderRadius:'50%',
                    background:'#FBBF24',color:'#000',fontSize:'0.6rem',fontWeight:800,
                    display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {a.badge}
                  </div>
                )}
              </button>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
