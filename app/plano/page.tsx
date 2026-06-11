'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface SemanaPlano {
  semana: number; foco_principal: string; foco_secundario: string
  horas_estudo: number; atividades: string[]; simulado: boolean
  redacao: boolean; flashcards: string; meta_acerto: number
}

export default function Plano() {
  const [user, setUser] = useState<any>(null)
  const [desempenho, setDesempenho] = useState<any[]>([])
  const [dataProva, setDataProva] = useState('')
  const [tipoProva, setTipoProva] = useState('ENEM')
  const [horasPorDia, setHorasPorDia] = useState('2')
  const [plano, setPlano] = useState<SemanaPlano[]>([])
  const [resumo, setResumo] = useState('')
  const [loading, setLoading] = useState(false)
  const [gerado, setGerado] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      setUser(user)
      const { data } = await supabase.from('desempenho').select('*').eq('user_id', user.id).order('percentual')
      setDesempenho(data || [])
    }
    load()
  }, [])

  const semanasFaltando = () => {
    if (!dataProva) return 0
    return Math.max(1, Math.ceil((new Date(dataProva).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 7)))
  }

  async function gerarPlano() {
    if (!dataProva) return
    setLoading(true)
    try {
      const res = await fetch('/api/plano', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, dataProva, horasPorDia, tipoProva })
      })
      const data = await res.json()
      if (data.plano) {
        setPlano(data.plano)
        setResumo(data.resumo || '')
        setGerado(true)
      }
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const S = {
    bg: '#07070d',
    card: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16 } as React.CSSProperties,
  }

  const AREA_COLORS: Record<string, string> = {
    'Matemática': '#818CF8', 'Linguagens': '#34D399',
    'Ciências Humanas': '#FBBF24', 'Ciências da Natureza': '#60A5FA',
  }

  return (
    <div style={{minHeight:'100vh',background:S.bg,fontFamily:'Plus Jakarta Sans,sans-serif'}}>
      <style>{`*{box-sizing:border-box} .tap{-webkit-tap-highlight-color:transparent;cursor:pointer;transition:opacity .15s,transform .15s} .tap:active{opacity:.7;transform:scale(.98)} a{text-decoration:none;color:inherit}`}</style>

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
          <h1 style={{fontSize:'1.3rem',fontWeight:800,letterSpacing:'-0.03em',color:'#FAFAFA'}}>📅 Plano de estudos</h1>
          <p style={{color:'#52525B',fontSize:'0.78rem',marginTop:3}}>
            {desempenho.length > 0 ? 'Gerado com base no seu desempenho real.' : 'Faça um simulado primeiro para personalizar ainda mais.'}
          </p>
        </div>

        {/* DIAGNÓSTICO ATUAL */}
        {desempenho.length > 0 && !gerado && (
          <div style={{...S.card,padding:16,marginBottom:16}}>
            <div style={{fontSize:'0.62rem',color:'#52525B',textTransform:'uppercase',letterSpacing:'0.1em',fontWeight:600,marginBottom:12}}>
              Seu diagnóstico atual
            </div>
            {desempenho.map(d => (
              <div key={d.area} style={{marginBottom:10}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.8rem',marginBottom:4}}>
                  <span style={{color:'#A1A1AA'}}>{d.area}</span>
                  <span style={{fontWeight:700,color:AREA_COLORS[d.area]||'#818CF8'}}>{Math.round(d.percentual)}%</span>
                </div>
                <div style={{height:4,borderRadius:100,background:'rgba(255,255,255,0.06)',overflow:'hidden'}}>
                  <div style={{height:'100%',borderRadius:100,background:AREA_COLORS[d.area]||'#6366F1',width:`${d.percentual}%`}}/>
                </div>
              </div>
            ))}
          </div>
        )}

        {!gerado && (
          <div style={{...S.card,padding:18,marginBottom:16}}>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <div>
                <label style={{fontSize:'0.72rem',color:'#71717A',marginBottom:6,display:'block',fontWeight:600}}>Tipo de prova</label>
                <select value={tipoProva} onChange={e=>setTipoProva(e.target.value)}
                  style={{width:'100%',padding:'11px 14px',borderRadius:10,fontSize:'0.88rem',outline:'none',
                    background:'#111113',border:'1px solid rgba(255,255,255,0.09)',color:'#FAFAFA'}}>
                  <option>ENEM</option>
                  <option>Concurso Público</option>
                </select>
              </div>
              <div>
                <label style={{fontSize:'0.72rem',color:'#71717A',marginBottom:6,display:'block',fontWeight:600}}>Data da prova</label>
                <input type="date" value={dataProva} onChange={e=>setDataProva(e.target.value)}
                  style={{width:'100%',padding:'11px 14px',borderRadius:10,fontSize:'0.88rem',outline:'none',
                    background:'#111113',border:'1px solid rgba(255,255,255,0.09)',color:'#FAFAFA'}}/>
              </div>
              <div>
                <label style={{fontSize:'0.72rem',color:'#71717A',marginBottom:6,display:'block',fontWeight:600}}>Horas por dia</label>
                <select value={horasPorDia} onChange={e=>setHorasPorDia(e.target.value)}
                  style={{width:'100%',padding:'11px 14px',borderRadius:10,fontSize:'0.88rem',outline:'none',
                    background:'#111113',border:'1px solid rgba(255,255,255,0.09)',color:'#FAFAFA'}}>
                  {['1','2','3','4','5'].map(h=><option key={h}>{h} hora{+h>1?'s':''}</option>)}
                </select>
              </div>
              {dataProva && (
                <div style={{padding:'10px 14px',borderRadius:10,background:'rgba(99,102,241,0.08)',border:'1px solid rgba(99,102,241,0.2)',fontSize:'0.8rem',color:'#818CF8',textAlign:'center'}}>
                  {semanasFaltando()} semanas até a prova
                </div>
              )}
              <button onClick={gerarPlano} disabled={!dataProva||loading} className="tap"
                style={{width:'100%',padding:'14px',borderRadius:12,fontWeight:800,fontSize:'0.88rem',border:'none',
                  background:!dataProva||loading?'rgba(255,255,255,0.04)':'linear-gradient(135deg,#6366F1,#818CF8)',
                  color:!dataProva||loading?'#52525B':'#fff',cursor:!dataProva||loading?'default':'pointer'}}>
                {loading?'Analisando seu desempenho...':'Gerar plano personalizado →'}
              </button>
            </div>
          </div>
        )}

        {/* PLANO GERADO */}
        {gerado && (
          <>
            {resumo && (
              <div style={{...S.card,padding:16,marginBottom:16,
                background:'rgba(99,102,241,0.06)',border:'1px solid rgba(99,102,241,0.2)'}}>
                <div style={{fontSize:'0.62rem',color:'#818CF8',textTransform:'uppercase',letterSpacing:'0.1em',fontWeight:600,marginBottom:8}}>
                  Diagnóstico IA
                </div>
                <p style={{fontSize:'0.82rem',color:'#A1A1AA',lineHeight:1.6}}>{resumo}</p>
              </div>
            )}

            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div>
                <h2 style={{fontSize:'1rem',fontWeight:800,color:'#FAFAFA'}}>Seu plano — {plano.length} semanas</h2>
                <p style={{fontSize:'0.72rem',color:'#52525B',marginTop:2}}>{horasPorDia}h/dia · {tipoProva}</p>
              </div>
              <button onClick={()=>{setGerado(false);setPlano([]);setResumo('')}} className="tap"
                style={{fontSize:'0.72rem',color:'#52525B',background:'none',border:'none',cursor:'pointer'}}>
                Refazer
              </button>
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {plano.map((s,i)=>(
                <div key={i} style={{...S.card,padding:18}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
                    <div>
                      <div style={{fontSize:'0.6rem',color:'#52525B',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:4}}>
                        Semana {s.semana}
                      </div>
                      <div style={{fontSize:'0.92rem',fontWeight:700,color:'#FAFAFA'}}>{s.foco_principal}</div>
                      <div style={{fontSize:'0.78rem',color:'#71717A',marginTop:2}}>{s.foco_secundario}</div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontSize:'1.2rem',fontWeight:800,color:'#818CF8'}}>{s.horas_estudo}h</div>
                      {s.meta_acerto && (
                        <div style={{fontSize:'0.62rem',color:'#52525B',marginTop:2}}>meta {s.meta_acerto}%</div>
                      )}
                    </div>
                  </div>

                  <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
                    {s.simulado&&<span style={{fontSize:'0.65rem',padding:'3px 9px',borderRadius:100,background:'rgba(99,102,241,0.1)',color:'#818CF8',border:'1px solid rgba(99,102,241,0.2)'}}>📝 Simulado</span>}
                    {s.redacao&&<span style={{fontSize:'0.65rem',padding:'3px 9px',borderRadius:100,background:'rgba(52,211,153,0.1)',color:'#34D399',border:'1px solid rgba(52,211,153,0.2)'}}>✍️ Redação</span>}
                    {s.flashcards&&<span style={{fontSize:'0.65rem',padding:'3px 9px',borderRadius:100,background:'rgba(251,191,36,0.1)',color:'#FBBF24',border:'1px solid rgba(251,191,36,0.2)'}}>⚡ {s.flashcards}</span>}
                  </div>

                  <div style={{display:'flex',flexDirection:'column',gap:5}}>
                    {s.atividades.map((a,j)=>(
                      <div key={j} style={{display:'flex',gap:8,fontSize:'0.78rem',color:'#A1A1AA'}}>
                        <span style={{color:'#6366F1',marginTop:1}}>·</span> {a}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:16}}>
              <Link href="/simulado">
                <button className="tap" style={{width:'100%',padding:'14px',borderRadius:12,fontWeight:800,fontSize:'0.85rem',border:'none',cursor:'pointer',
                  background:'linear-gradient(135deg,#6366F1,#818CF8)',color:'#fff'}}>
                  Fazer simulado →
                </button>
              </Link>
              <Link href="/flashcards">
                <button className="tap" style={{width:'100%',padding:'14px',borderRadius:12,fontWeight:700,fontSize:'0.85rem',cursor:'pointer',
                  background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.09)',color:'#E4E4E7'}}>
                  ⚡ Flashcards →
                </button>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
