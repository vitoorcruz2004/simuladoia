'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Amigo { id: string; amigo_id: string; amigo: { id: string; nome: string; email: string } }
interface Pendente { id: string; user_id: string; solicitante: { id: string; nome: string; email: string } }
interface RankingItem { user_id: string; pontos_semana: number; profiles: { nome: string } }

export default function Amigos() {
  const [user, setUser] = useState<any>(null)
  const [amigos, setAmigos] = useState<Amigo[]>([])
  const [pendentes, setPendentes] = useState<Pendente[]>([])
  const [ranking, setRanking] = useState<RankingItem[]>([])
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [msgTipo, setMsgTipo] = useState<'ok'|'erro'>('ok')
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const router = useRouter()

  async function carregar(userId: string) {
    const res = await fetch(`/api/amigos?userId=${userId}`)
    const data = await res.json()
    setAmigos(data.amigos || [])
    setPendentes(data.pendentes || [])
    setRanking(data.rankingAmigos || [])
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      setUser(user)
      await carregar(user.id)
      setLoading(false)
    }
    load()
  }, [])

  async function convidar() {
    if (!email.trim() || !user) return
    setEnviando(true)
    const res = await fetch('/api/amigos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'convidar', userId: user.id, amigoId: email.trim() })
    })
    const data = await res.json()
    if (data.sucesso) {
      setMsg(`✓ Convite enviado para ${data.perfil.nome || email}!`)
      setMsgTipo('ok')
      setEmail('')
      await carregar(user.id)
    } else {
      setMsg(data.error || 'Erro ao enviar convite')
      setMsgTipo('erro')
    }
    setEnviando(false)
    setTimeout(() => setMsg(''), 3000)
  }

  async function responder(amizadeId: string, aceitar: boolean) {
    await fetch('/api/amigos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: aceitar ? 'aceitar' : 'recusar', userId: user?.id, amizadeId })
    })
    await carregar(user.id)
  }

  const S = {
    bg: '#07070d',
    card: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16 } as React.CSSProperties,
    label: { fontSize: '0.6rem', color: '#3F3F46', textTransform: 'uppercase' as const, letterSpacing: '0.1em', fontWeight: 600, marginBottom: 12 },
  }

  const MEDALS = ['🥇', '🥈', '🥉']

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:S.bg}}>
      <div style={{width:32,height:32,border:'3px solid rgba(99,102,241,0.3)',borderTop:'3px solid #6366F1',borderRadius:'50%',animation:'spin 1s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:S.bg,fontFamily:'Plus Jakarta Sans,sans-serif'}}>
      <style>{`*{box-sizing:border-box} .tap{-webkit-tap-highlight-color:transparent;cursor:pointer;transition:opacity .15s,transform .15s} .tap:active{opacity:.7;transform:scale(.97)} a{text-decoration:none;color:inherit}`}</style>

      <div style={{position:'sticky',top:0,zIndex:100,background:'rgba(7,7,13,0.92)',backdropFilter:'blur(20px)',
        borderBottom:'1px solid rgba(255,255,255,0.06)',padding:'0 16px',height:52,
        display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <span style={{fontWeight:800,fontSize:'1rem',letterSpacing:'-0.03em',color:'#FAFAFA'}}>
          Simulado<span style={{color:'#818CF8'}}>IA</span>
        </span>
        <Link href="/dashboard"><span style={{fontSize:'0.78rem',color:'#52525B'}}>← Voltar</span></Link>
      </div>

      <div style={{maxWidth:480,margin:'0 auto',padding:'20px 14px 80px'}}>

        <div style={{marginBottom:24}}>
          <h1 style={{fontSize:'1.3rem',fontWeight:800,letterSpacing:'-0.03em',color:'#FAFAFA'}}>👥 Amigos</h1>
          <p style={{color:'#52525B',fontSize:'0.78rem',marginTop:3}}>Compita com amigos e se motive estudando junto.</p>
        </div>

        {/* CONVIDAR */}
        <div style={{...S.card,padding:18,marginBottom:16}}>
          <div style={S.label}>Convidar amigo</div>
          <div style={{display:'flex',gap:8}}>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
              placeholder="Email do amigo"
              onKeyDown={e=>e.key==='Enter'&&convidar()}
              style={{flex:1,padding:'11px 14px',borderRadius:10,fontSize:'0.85rem',outline:'none',
                background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.09)',color:'#FAFAFA'}}/>
            <button onClick={convidar} disabled={enviando||!email.trim()} className="tap"
              style={{padding:'11px 16px',borderRadius:10,fontWeight:700,fontSize:'0.82rem',
                border:'none',cursor:email.trim()?'pointer':'default',whiteSpace:'nowrap',
                background:email.trim()?'linear-gradient(135deg,#6366F1,#818CF8)':'rgba(255,255,255,0.04)',
                color:email.trim()?'#fff':'#52525B'}}>
              {enviando?'...':'Convidar'}
            </button>
          </div>
          {msg&&(
            <div style={{marginTop:10,fontSize:'0.75rem',color:msgTipo==='ok'?'#34D399':'#F87171',
              padding:'8px 12px',borderRadius:8,
              background:msgTipo==='ok'?'rgba(52,211,153,0.08)':'rgba(248,113,113,0.08)'}}>
              {msg}
            </div>
          )}
        </div>

        {/* CONVITES PENDENTES */}
        {pendentes.length > 0 && (
          <div style={{...S.card,padding:18,marginBottom:16,
            background:'rgba(99,102,241,0.06)',border:'1px solid rgba(99,102,241,0.2)'}}>
            <div style={{...S.label,color:'#818CF8'}}>Convites recebidos ({pendentes.length})</div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {pendentes.map(p=>(
                <div key={p.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <div style={{width:34,height:34,borderRadius:'50%',
                      background:'linear-gradient(135deg,#6366F1,#818CF8)',
                      display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:'0.75rem',fontWeight:800,color:'#fff',flexShrink:0}}>
                      {(p.solicitante.nome||p.solicitante.email)[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{fontSize:'0.85rem',fontWeight:600,color:'#FAFAFA'}}>{p.solicitante.nome||'Usuário'}</div>
                      <div style={{fontSize:'0.65rem',color:'#52525B'}}>{p.solicitante.email}</div>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:8,flexShrink:0}}>
                    <button onClick={()=>responder(p.id,true)} className="tap"
                      style={{padding:'6px 12px',borderRadius:8,fontWeight:700,fontSize:'0.72rem',
                        cursor:'pointer',background:'rgba(52,211,153,0.12)',color:'#34D399',border:'1px solid rgba(52,211,153,0.25)'}}>
                      ✓ Aceitar
                    </button>
                    <button onClick={()=>responder(p.id,false)} className="tap"
                      style={{padding:'6px 12px',borderRadius:8,fontWeight:700,fontSize:'0.72rem',
                        cursor:'pointer',background:'rgba(255,255,255,0.03)',color:'#71717A',
                        border:'1px solid rgba(255,255,255,0.07)'}}>
                      ✗
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RANKING ENTRE AMIGOS */}
        {ranking.length > 0 && (
          <div style={{...S.card,padding:18,marginBottom:16}}>
            <div style={S.label}>🏆 Ranking semanal — você e seus amigos</div>
            <div style={{display:'flex',flexDirection:'column',gap:2}}>
              {ranking.map((r,i)=>{
                const isMe = r.user_id === user?.id
                return (
                  <div key={r.user_id} style={{
                    display:'flex',alignItems:'center',gap:12,padding:'10px 12px',borderRadius:12,
                    background:isMe?'rgba(99,102,241,0.08)':'rgba(255,255,255,0.02)',
                    border:isMe?'1px solid rgba(99,102,241,0.2)':'1px solid rgba(255,255,255,0.04)',
                    marginBottom:4}}>
                    <div style={{fontSize:'1.2rem',width:24,textAlign:'center'}}>
                      {i<3?MEDALS[i]:<span style={{fontSize:'0.8rem',color:'#52525B',fontWeight:700}}>{i+1}</span>}
                    </div>
                    <div style={{flex:1}}>
                      <span style={{fontSize:'0.85rem',fontWeight:600,color:isMe?'#818CF8':'#FAFAFA'}}>
                        {r.profiles?.nome || 'Usuário'}
                        {isMe&&<span style={{fontSize:'0.65rem',color:'#818CF8',marginLeft:6}}>você</span>}
                      </span>
                    </div>
                    <div style={{fontSize:'1rem',fontWeight:800,color:i===0?'#FBBF24':'#818CF8'}}>
                      {r.pontos_semana} pts
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* LISTA DE AMIGOS */}
        <div style={{...S.card,padding:18}}>
          <div style={S.label}>Amigos ({amigos.length})</div>
          {amigos.length === 0 ? (
            <div style={{textAlign:'center',padding:'20px 0'}}>
              <div style={{fontSize:'2rem',marginBottom:8}}>👋</div>
              <p style={{fontSize:'0.82rem',color:'#52525B'}}>Você ainda não tem amigos aqui.</p>
              <p style={{fontSize:'0.75rem',color:'#3F3F46',marginTop:4}}>Convide alguém pelo email acima!</p>
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {amigos.map(a=>(
                <div key={a.id} style={{display:'flex',alignItems:'center',gap:12}}>
                  <div style={{width:36,height:36,borderRadius:'50%',
                    background:'linear-gradient(135deg,rgba(99,102,241,0.5),rgba(129,140,248,0.5))',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:'0.78rem',fontWeight:800,color:'#fff',flexShrink:0}}>
                    {(a.amigo.nome||a.amigo.email)[0].toUpperCase()}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:'0.85rem',fontWeight:600,color:'#FAFAFA'}}>{a.amigo.nome||'Usuário'}</div>
                    <div style={{fontSize:'0.65rem',color:'#52525B'}}>{a.amigo.email}</div>
                  </div>
                  <div style={{fontSize:'0.65rem',color:'#34D399'}}>✓ Amigos</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
