'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { BADGES, comprarStreakFreeze } from '@/lib/gamificacao'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Desempenho { area: string; percentual: number; total_respondidas: number }
interface Simulado { id: string; created_at: string; percentual: number; total_questoes: number; acertos: number }
interface Gam { pontos: number; streak_atual: number; streak_maximo: number; total_simulados: number; total_redacoes: number; badges: string[]; meta_diaria: number; questoes_hoje: number; streak_freeze: number }

const AREA_COLORS: Record<string, string> = {
  'Matemática': '#818CF8', 'Linguagens': '#34D399',
  'Ciências Humanas': '#FBBF24', 'Ciências da Natureza': '#60A5FA',
}
const AREA_ICONS: Record<string, string> = {
  'Matemática': '📐', 'Linguagens': '📝',
  'Ciências Humanas': '🌍', 'Ciências da Natureza': '🔬',
}

function CircleProgress({ pct, size=64, stroke=6, color='#6366F1', children }: any) {
  const r = (size-stroke)/2, circ = 2*Math.PI*r, offset = circ-(pct/100)*circ
  return (
    <div style={{position:'relative',width:size,height:size,flexShrink:0}}>
      <svg width={size} height={size} style={{transform:'rotate(-90deg)'}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{transition:'stroke-dashoffset 1s ease'}}/>
      </svg>
      <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>{children}</div>
    </div>
  )
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [desempenho, setDesempenho] = useState<Desempenho[]>([])
  const [simulados, setSimulados] = useState<Simulado[]>([])
  const [gam, setGam] = useState<Gam|null>(null)
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
      const [{ data: prof },{ data: desemp },{ data: sims },{ data: g },{ data: erradas }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id',user.id).single(),
        supabase.from('desempenho').select('*').eq('user_id',user.id).order('percentual'),
        supabase.from('simulados').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(3),
        supabase.from('gamificacao').select('*').eq('user_id',user.id).single(),
        supabase.from('questoes_erradas').select('id').eq('user_id',user.id),
      ])
      setProfile(prof); setDesempenho(desemp||[]); setSimulados(sims||[])
      setGam(g||null); setTotalErradas(erradas?.length||0); setLoading(false)
    }
    load()
  }, [])

  async function handleFreeze() {
    if (!user||comprando) return
    setComprando(true)
    const ok = await comprarStreakFreeze(user.id)
    if (ok) { setFreezeMsg('✓ Freeze ativado!'); const {data:g}=await supabase.from('gamificacao').select('*').eq('user_id',user.id).single(); setGam(g) }
    else setFreezeMsg('Precisa de 50 pts')
    setComprando(false); setTimeout(()=>setFreezeMsg(''),3000)
  }

  async function sair() { await supabase.auth.signOut(); router.push('/auth') }

  const notaGeral = desempenho.length ? Math.round(desempenho.reduce((a,d)=>a+d.percentual,0)/desempenho.length) : 0
  const totalQuestoes = desempenho.reduce((a,d)=>a+d.total_respondidas,0)
  const piorArea = desempenho[0]
  const badgesOk = gam ? BADGES.filter(b=>gam.badges?.includes(b.id)) : []
  const metaPct = gam ? Math.min(100,Math.round(((gam.questoes_hoje||0)/(gam.meta_diaria||10))*100)) : 0
  const metaOk = gam && (gam.questoes_hoje||0)>=(gam.meta_diaria||10)
  const nome = profile?.nome?.split(' ')[0] || user?.email?.split('@')[0] || 'Estudante'
  const cor = (n:number) => n>=70?'#34D399':n>=50?'#FBBF24':'#F87171'

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#07070d'}}>
      <div style={{width:34,height:34,border:'3px solid rgba(99,102,241,0.3)',borderTop:'3px solid #6366F1',borderRadius:'50%',animation:'spin 1s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const S = { // shared styles
    card: { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:18, padding:'16px' } as React.CSSProperties,
    label: { fontSize:'0.6rem', color:'#3F3F46', textTransform:'uppercase' as const, letterSpacing:'0.1em', fontWeight:600, marginBottom:12 },
  }

  return (
    <div style={{minHeight:'100vh',background:'#07070d',WebkitFontSmoothing:'antialiased'}}>
      <style>{`
        *{box-sizing:border-box}
        @keyframes up{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .u{animation:up .35s ease both}
        .u1{animation-delay:.05s}.u2{animation-delay:.1s}.u3{animation-delay:.15s}
        .u4{animation-delay:.2s}.u5{animation-delay:.25s}.u6{animation-delay:.3s}
        .tap{-webkit-tap-highlight-color:transparent;cursor:pointer;transition:opacity .15s,transform .15s}
        .tap:active{opacity:.7;transform:scale(.97)}
        a{text-decoration:none;color:inherit}
        @media(min-width:640px){.wrap{max-width:600px!important;padding:28px 24px 80px!important}}
      `}</style>

      {/* NAV */}
      <div style={{position:'sticky',top:0,zIndex:100,background:'rgba(7,7,13,0.92)',backdropFilter:'blur(20px)',
        borderBottom:'1px solid rgba(255,255,255,0.06)',padding:'0 16px',height:52,
        display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <span style={{fontWeight:800,fontSize:'1rem',letterSpacing:'-0.03em',color:'#FAFAFA'}}>
          Simulado<span style={{color:'#818CF8'}}>IA</span>
        </span>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:28,height:28,borderRadius:'50%',background:'linear-gradient(135deg,#6366F1,#818CF8)',
            display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.68rem',fontWeight:800,color:'#fff'}}>
            {nome[0].toUpperCase()}
          </div>
          <button onClick={sair} className="tap" style={{fontSize:'0.72rem',color:'#52525B',background:'none',border:'none'}}>Sair</button>
        </div>
      </div>

      <div className="wrap" style={{maxWidth:480,margin:'0 auto',padding:'16px 14px 100px'}}>

        {/* GREETING */}
        <div className="u" style={{marginBottom:16}}>
          <h1 style={{fontSize:'1.3rem',fontWeight:800,letterSpacing:'-0.03em',color:'#FAFAFA'}}>Olá, {nome} 👋</h1>
          <p style={{color:'#52525B',fontSize:'0.78rem',marginTop:3}}>
            {totalQuestoes===0?'Faça seu primeiro simulado agora.':`${totalQuestoes} questões respondidas · continue!`}
          </p>
        </div>

        {/* STREAK */}
        {gam && (
          <div className="u u1" style={{...S.card,
            marginBottom:12,
            background:gam.streak_atual>=3?'linear-gradient(135deg,rgba(245,158,11,0.14),rgba(239,68,68,0.06))':'rgba(255,255,255,0.03)',
            border:gam.streak_atual>=3?'1px solid rgba(245,158,11,0.28)':'1px solid rgba(255,255,255,0.07)'}}>
            <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:14}}>
              <CircleProgress pct={Math.min(100,gam.streak_atual*3.3)} size={60} stroke={5}
                color={gam.streak_atual>=7?'#f59e0b':gam.streak_atual>=3?'#fb923c':'#6366F1'}>
                <span style={{fontSize:'1.2rem'}}>{gam.streak_atual>=3?'🔥':'⚡'}</span>
              </CircleProgress>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:'1.7rem',fontWeight:900,letterSpacing:'-0.04em',lineHeight:1,
                  color:gam.streak_atual>=3?'#f59e0b':'#FAFAFA'}}>
                  {gam.streak_atual}<span style={{fontSize:'0.8rem',fontWeight:400,color:'#52525B',marginLeft:5}}>dias</span>
                </div>
                <div style={{fontSize:'0.65rem',color:'#52525B',marginTop:3}}>
                  🏆 {gam.streak_maximo} · ⚡ {gam.pontos} pts{gam.streak_freeze>0&&<span style={{color:'#818CF8'}}> · 🛡️{gam.streak_freeze}</span>}
                </div>
              </div>
              <button onClick={handleFreeze} disabled={comprando||gam.pontos<50} className="tap"
                style={{fontSize:'0.6rem',padding:'6px 9px',borderRadius:8,lineHeight:1.4,textAlign:'center',
                  background:gam.pontos>=50?'rgba(99,102,241,0.12)':'rgba(255,255,255,0.03)',
                  color:gam.pontos>=50?'#818CF8':'#3F3F46',
                  border:`1px solid ${gam.pontos>=50?'rgba(99,102,241,0.25)':'rgba(255,255,255,0.05)'}`,
                  cursor:gam.pontos>=50?'pointer':'default'}}>
                🛡️<br/>Freeze<br/><span style={{opacity:.6}}>50pts</span>
              </button>
            </div>
            <div style={{fontSize:'0.65rem',color:'#52525B',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6,display:'flex',justifyContent:'space-between'}}>
              <span>Meta diária</span>
              <span style={{color:metaOk?'#34D399':'#FAFAFA',textTransform:'none',letterSpacing:0}}>
                {metaOk?'✓ Concluída!':`${gam.questoes_hoje||0}/${gam.meta_diaria||10}`}
              </span>
            </div>
            <div style={{height:6,borderRadius:100,background:'rgba(255,255,255,0.06)',overflow:'hidden'}}>
              <div style={{height:'100%',borderRadius:100,width:`${metaPct}%`,transition:'width 1s ease',
                background:metaOk?'linear-gradient(90deg,#34D399,#059669)':'linear-gradient(90deg,#6366F1,#818CF8)'}}/>
            </div>
            {freezeMsg&&<div style={{fontSize:'0.68rem',color:'#818CF8',marginTop:8,textAlign:'center'}}>{freezeMsg}</div>}
          </div>
        )}

        {/* STATS */}
        <div className="u u2" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:9,marginBottom:12}}>
          {[
            {l:'Aproveit.',v:`${notaGeral}%`,s:notaGeral>=70?'Excelente':notaGeral>=50?'Evoluindo':'Treinar',c:cor(notaGeral)},
            {l:'Simulados',v:String(simulados.length),s:`${totalQuestoes} questões`,c:'#818CF8'},
            {l:'Maior gap',v:piorArea?AREA_ICONS[piorArea.area]||'📌':'—',
              s:piorArea?piorArea.area.split(' ').slice(-1)[0]:'—',c:'#F87171'},
          ].map((s,i)=>(
            <div key={i} style={{...S.card,padding:'12px 10px'}}>
              <div style={{...S.label,marginBottom:8,fontSize:'0.57rem'}}>{s.l}</div>
              <div style={{fontSize:'1.4rem',fontWeight:900,letterSpacing:'-0.03em',color:s.c,lineHeight:1}}>{s.v}</div>
              <div style={{fontSize:'0.62rem',color:'#52525B',marginTop:5,lineHeight:1.3}}>{s.s}</div>
            </div>
          ))}
        </div>

        {/* DESEMPENHO */}
        {desempenho.length>0&&(
          <div className="u u3" style={{...S.card,marginBottom:12}}>
            <div style={S.label}>Desempenho por área</div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {desempenho.map(d=>{
                const c=AREA_COLORS[d.area]||'#818CF8'
                return (
                  <div key={d.area}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5}}>
                      <div style={{display:'flex',alignItems:'center',gap:6}}>
                        <span style={{fontSize:'0.85rem'}}>{AREA_ICONS[d.area]}</span>
                        <span style={{fontSize:'0.8rem',fontWeight:600,color:'#E4E4E7'}}>{d.area}</span>
                      </div>
                      <span style={{fontSize:'0.88rem',fontWeight:800,color:c}}>{Math.round(d.percentual)}%</span>
                    </div>
                    <div style={{height:4,borderRadius:100,background:'rgba(255,255,255,0.06)',overflow:'hidden'}}>
                      <div style={{height:'100%',borderRadius:100,background:c,width:`${d.percentual}%`,transition:'width 1s ease'}}/>
                    </div>
                    <div style={{fontSize:'0.6rem',color:'#3F3F46',marginTop:3}}>{d.total_respondidas} questões</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* BADGES */}
        {badgesOk.length>0&&(
          <div className="u u4" style={{...S.card,marginBottom:12}}>
            <div style={S.label}>Conquistas ({badgesOk.length}/{BADGES.length})</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:7}}>
              {badgesOk.map(b=>(
                <div key={b.id} style={{display:'flex',alignItems:'center',gap:5,padding:'5px 10px',borderRadius:100,
                  background:'rgba(99,102,241,0.1)',border:'1px solid rgba(99,102,241,0.2)'}}>
                  <span style={{fontSize:'0.85rem'}}>{b.emoji}</span>
                  <span style={{fontSize:'0.68rem',fontWeight:600,color:'#818CF8'}}>{b.nome}</span>
                </div>
              ))}
              {BADGES.filter(b=>!gam?.badges?.includes(b.id)).slice(0,2).map(b=>(
                <div key={b.id} style={{display:'flex',alignItems:'center',gap:5,padding:'5px 10px',borderRadius:100,
                  background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.05)',opacity:.3}}>
                  <span style={{fontSize:'0.85rem',filter:'grayscale(1)'}}>{b.emoji}</span>
                  <span style={{fontSize:'0.68rem',color:'#52525B'}}>{b.nome}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* HISTÓRICO */}
        {simulados.length>0&&(
          <div className="u u5" style={{...S.card,marginBottom:12}}>
            <div style={S.label}>Últimos simulados</div>
            {simulados.map((s,i)=>(
              <div key={s.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',
                padding:'9px 0',borderBottom:i<simulados.length-1?'1px solid rgba(255,255,255,0.05)':'none'}}>
                <div>
                  <div style={{fontSize:'0.8rem',color:'#A1A1AA',fontWeight:500}}>{s.total_questoes} questões</div>
                  <div style={{fontSize:'0.63rem',color:'#3F3F46',marginTop:2}}>{new Date(s.created_at).toLocaleDateString('pt-BR')}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:'1.05rem',fontWeight:800,color:cor(s.percentual)}}>{Math.round(s.percentual)}%</div>
                  <div style={{fontSize:'0.6rem',color:'#3F3F46'}}>{s.acertos}/{s.total_questoes}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* AÇÕES */}
        <div className="u u6" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
          <Link href="/simulado">
            <button className="tap" style={{width:'100%',padding:'16px 10px',borderRadius:15,fontWeight:800,
              fontSize:'0.88rem',border:'none',cursor:'pointer',
              background:'linear-gradient(135deg,#6366F1,#818CF8)',color:'#fff',
              boxShadow:'0 6px 20px rgba(99,102,241,0.35)'}}>
              🚀 {totalQuestoes===0?'Primeiro simulado':'Novo simulado'}
            </button>
          </Link>
          <Link href="/redacao">
            <button className="tap" style={{width:'100%',padding:'16px 10px',borderRadius:15,fontWeight:700,
              fontSize:'0.88rem',cursor:'pointer',color:'#E4E4E7',
              background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.09)'}}>
              ✍️ Treinar redação
            </button>
          </Link>
        </div>
        <div className="u u6" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
          {[
            {href:'/revisao',icon:'🔄',label:'Revisão',badge:totalErradas>0?totalErradas:null,accent:totalErradas>0},
            {href:'/plano',icon:'📅',label:'Plano',badge:null,accent:false},
            {href:'/sisu',icon:'🎓',label:'SiSU',badge:null,accent:false},
            {href:'/leaderboard',icon:'🏆',label:'Ranking',badge:null,accent:false},
          ].map(a=>(
            <Link key={a.href} href={a.href}>
              <button className="tap" style={{width:'100%',padding:'12px 5px',borderRadius:13,position:'relative',
                background:a.accent?'rgba(251,191,36,0.08)':'rgba(255,255,255,0.03)',
                border:a.accent?'1px solid rgba(251,191,36,0.2)':'1px solid rgba(255,255,255,0.07)',
                color:a.accent?'#FBBF24':'#71717A',fontSize:'0.7rem',fontWeight:600,cursor:'pointer'}}>
                <div style={{fontSize:'1.2rem',marginBottom:4}}>{a.icon}</div>
                {a.label}
                {a.badge&&(
                  <div style={{position:'absolute',top:5,right:5,width:16,height:16,borderRadius:'50%',
                    background:'#FBBF24',color:'#000',fontSize:'0.55rem',fontWeight:800,
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
