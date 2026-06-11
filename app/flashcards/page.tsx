'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Flashcard { id: string; area: string; frente: string; verso: string; proxima_revisao: string; acertos_seguidos: number }

const AREAS = [
  { label: 'Matemática', icon: '📐', cor: '#818CF8' },
  { label: 'Linguagens', icon: '📝', cor: '#34D399' },
  { label: 'Ciências Humanas', icon: '🌍', cor: '#FBBF24' },
  { label: 'Ciências da Natureza', icon: '🔬', cor: '#60A5FA' },
]

export default function Flashcards() {
  const [user, setUser] = useState<any>(null)
  const [fase, setFase] = useState<'menu' | 'gerando' | 'estudando' | 'fim'>('menu')
  const [areaSelecionada, setAreaSelecionada] = useState('')
  const [cards, setCards] = useState<Flashcard[]>([])
  const [atual, setAtual] = useState(0)
  const [virado, setVirado] = useState(false)
  const [acertos, setAcertos] = useState(0)
  const [erros, setErros] = useState(0)
  const [pendentes, setPendentes] = useState<Flashcard[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      setUser(user)
      setLoading(false)
    }
    load()
  }, [])

  async function carregarPendentes() {
    if (!user) return
    const hoje = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('flashcards').select('*')
      .eq('user_id', user.id).lte('proxima_revisao', hoje).limit(20)
    setPendentes(data || [])
  }

  useEffect(() => { if (user) carregarPendentes() }, [user])

  async function gerarFlashcards() {
    if (!areaSelecionada) return
    setFase('gerando')
    try {
      const res = await fetch('/api/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, area: areaSelecionada, quantidade: 10 })
      })
      const data = await res.json()
      if (data.flashcards) {
        const cardsComId = data.flashcards.map((c: any, i: number) => ({
          id: `temp-${i}`, area: areaSelecionada, ...c,
          proxima_revisao: new Date().toISOString().split('T')[0], acertos_seguidos: 0
        }))
        setCards(cardsComId)
        setAtual(0); setVirado(false); setAcertos(0); setErros(0)
        setFase('estudando')
      }
    } catch { setFase('menu') }
  }

  function iniciarRevisao() {
    setCards(pendentes)
    setAtual(0); setVirado(false); setAcertos(0); setErros(0)
    setFase('estudando')
  }

  async function responder(acertou: boolean) {
    const card = cards[atual]
    if (acertou) setAcertos(a => a + 1)
    else setErros(e => e + 1)

    // Algoritmo de repetição espaçada simplificado (SM-2)
    if (card.id && !card.id.startsWith('temp-')) {
      const diasProximo = acertou
        ? Math.min(30, Math.pow(2, card.acertos_seguidos || 0))
        : 1
      const proxima = new Date()
      proxima.setDate(proxima.getDate() + diasProximo)
      await supabase.from('flashcards').update({
        proxima_revisao: proxima.toISOString().split('T')[0],
        acertos_seguidos: acertou ? (card.acertos_seguidos || 0) + 1 : 0,
        total_revisoes: (card.acertos_seguidos || 0) + 1,
      }).eq('id', card.id)
    }

    if (atual < cards.length - 1) {
      setAtual(a => a + 1)
      setVirado(false)
    } else {
      setFase('fim')
      carregarPendentes()
    }
  }

  const S = {
    bg: '#07070d',
    card: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18 } as React.CSSProperties,
  }

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:S.bg}}>
      <div style={{width:32,height:32,border:'3px solid rgba(99,102,241,0.3)',borderTop:'3px solid #6366F1',borderRadius:'50%',animation:'spin 1s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:S.bg,fontFamily:'Plus Jakarta Sans,sans-serif'}}>
      <style>{`
        *{box-sizing:border-box}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes flip{0%{transform:rotateY(0)}50%{transform:rotateY(90deg)}100%{transform:rotateY(0)}}
        .tap{-webkit-tap-highlight-color:transparent;cursor:pointer;transition:opacity .15s,transform .15s}
        .tap:active{opacity:.7;transform:scale(.97)}
        a{text-decoration:none;color:inherit}
      `}</style>

      <div style={{position:'sticky',top:0,zIndex:100,background:'rgba(7,7,13,0.92)',backdropFilter:'blur(20px)',
        borderBottom:'1px solid rgba(255,255,255,0.06)',padding:'0 16px',height:52,
        display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <span style={{fontWeight:800,fontSize:'1rem',letterSpacing:'-0.03em',color:'#FAFAFA'}}>
          Simulado<span style={{color:'#818CF8'}}>IA</span>
        </span>
        <Link href="/dashboard">
          <span style={{fontSize:'0.78rem',color:'#52525B'}}>← Voltar</span>
        </Link>
      </div>

      <div style={{maxWidth:480,margin:'0 auto',padding:'20px 14px 80px'}}>

        {/* MENU */}
        {fase === 'menu' && (
          <>
            <div style={{marginBottom:24}}>
              <h1 style={{fontSize:'1.3rem',fontWeight:800,letterSpacing:'-0.03em',color:'#FAFAFA'}}>
                ⚡ Flashcards
              </h1>
              <p style={{color:'#52525B',fontSize:'0.78rem',marginTop:3}}>
                Estude com repetição espaçada — o método mais eficiente do mundo.
              </p>
            </div>

            {/* REVISÃO PENDENTE */}
            {pendentes.length > 0 && (
              <div style={{...S.card,padding:18,marginBottom:16,
                background:'linear-gradient(135deg,rgba(99,102,241,0.1),rgba(99,102,241,0.04))',
                border:'1px solid rgba(99,102,241,0.25)'}}>
                <div style={{fontSize:'0.65rem',color:'#818CF8',textTransform:'uppercase',letterSpacing:'0.1em',fontWeight:600,marginBottom:10}}>
                  Revisão pendente
                </div>
                <div style={{fontSize:'1.8rem',fontWeight:900,color:'#FAFAFA',letterSpacing:'-0.03em',marginBottom:4}}>
                  {pendentes.length} <span style={{fontSize:'0.9rem',fontWeight:400,color:'#52525B'}}>cards pra revisar hoje</span>
                </div>
                <button onClick={iniciarRevisao} className="tap"
                  style={{width:'100%',marginTop:12,padding:'13px',borderRadius:12,fontWeight:800,
                    fontSize:'0.88rem',border:'none',cursor:'pointer',
                    background:'linear-gradient(135deg,#6366F1,#818CF8)',color:'#fff'}}>
                  Revisar agora →
                </button>
              </div>
            )}

            {/* GERAR NOVOS */}
            <div style={{...S.card,padding:18,marginBottom:16}}>
              <div style={{fontSize:'0.65rem',color:'#52525B',textTransform:'uppercase',letterSpacing:'0.1em',fontWeight:600,marginBottom:14}}>
                Gerar novos flashcards por área
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
                {AREAS.map(a => (
                  <button key={a.label} onClick={() => setAreaSelecionada(a.label)} className="tap"
                    style={{padding:'14px 10px',borderRadius:14,textAlign:'left',
                      background: areaSelecionada===a.label ? `rgba(${a.cor.replace('#','').match(/../g)?.map(h=>parseInt(h,16)).join(',')},0.15)` : 'rgba(255,255,255,0.03)',
                      border: areaSelecionada===a.label ? `1px solid ${a.cor}66` : '1px solid rgba(255,255,255,0.07)',
                      cursor:'pointer'}}>
                    <div style={{fontSize:'1.4rem',marginBottom:6}}>{a.icon}</div>
                    <div style={{fontSize:'0.75rem',fontWeight:700,color: areaSelecionada===a.label ? a.cor : '#A1A1AA'}}>
                      {a.label}
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={gerarFlashcards} disabled={!areaSelecionada} className="tap"
                style={{width:'100%',padding:'14px',borderRadius:12,fontWeight:800,fontSize:'0.88rem',
                  border:'none',cursor:areaSelecionada?'pointer':'default',
                  background:areaSelecionada?'linear-gradient(135deg,#6366F1,#818CF8)':'rgba(255,255,255,0.04)',
                  color:areaSelecionada?'#fff':'#52525B'}}>
                {areaSelecionada ? `Gerar flashcards de ${areaSelecionada} →` : 'Selecione uma área'}
              </button>
            </div>
          </>
        )}

        {/* GERANDO */}
        {fase === 'gerando' && (
          <div style={{minHeight:'60vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,textAlign:'center'}}>
            <div style={{width:48,height:48,border:'4px solid rgba(99,102,241,0.3)',borderTop:'4px solid #6366F1',borderRadius:'50%',animation:'spin 1s linear infinite'}}/>
            <div>
              <div style={{fontSize:'1rem',fontWeight:700,color:'#FAFAFA',marginBottom:4}}>Gerando flashcards...</div>
              <div style={{fontSize:'0.75rem',color:'#52525B'}}>IA criando cards personalizados de {areaSelecionada}</div>
            </div>
          </div>
        )}

        {/* ESTUDANDO */}
        {fase === 'estudando' && cards.length > 0 && (
          <>
            {/* PROGRESSO */}
            <div style={{marginBottom:20}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.72rem',marginBottom:8}}>
                <span style={{color:'#52525B'}}>{atual + 1} / {cards.length}</span>
                <div style={{display:'flex',gap:12}}>
                  <span style={{color:'#34D399'}}>✓ {acertos}</span>
                  <span style={{color:'#F87171'}}>✗ {erros}</span>
                </div>
              </div>
              <div style={{height:4,borderRadius:100,background:'rgba(255,255,255,0.06)',overflow:'hidden'}}>
                <div style={{height:'100%',borderRadius:100,background:'linear-gradient(90deg,#6366F1,#818CF8)',
                  width:`${((atual)/cards.length)*100}%`,transition:'width .4s ease'}}/>
              </div>
            </div>

            {/* CARD */}
            <div onClick={() => setVirado(!virado)} className="tap"
              style={{...S.card,padding:'32px 24px',minHeight:260,display:'flex',flexDirection:'column',
                alignItems:'center',justifyContent:'center',textAlign:'center',marginBottom:20,
                cursor:'pointer',position:'relative',
                background: virado ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.03)',
                border: virado ? '1px solid rgba(99,102,241,0.2)' : '1px solid rgba(255,255,255,0.07)',
                transition:'all .3s ease'}}>
              <div style={{fontSize:'0.6rem',color:'#52525B',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:16,fontWeight:600}}>
                {virado ? '✓ Resposta' : cards[atual]?.area + ' · Toque para revelar'}
              </div>
              <div style={{fontSize:'1rem',lineHeight:1.6,color: virado ? '#FAFAFA' : '#E4E4E7',fontWeight: virado ? 400 : 600}}>
                {virado ? cards[atual]?.verso : cards[atual]?.frente}
              </div>
              {!virado && (
                <div style={{position:'absolute',bottom:16,fontSize:'0.68rem',color:'#3F3F46'}}>
                  👆 Toque para ver a resposta
                </div>
              )}
            </div>

            {/* BOTÕES */}
            {virado ? (
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <button onClick={() => responder(false)} className="tap"
                  style={{padding:'16px',borderRadius:14,fontWeight:700,fontSize:'0.88rem',cursor:'pointer',background:'rgba(239,68,68,0.1)',color:'#F87171',border:'1px solid rgba(239,68,68,0.25)'}}>
                  ✗ Não sabia
                </button>
                <button onClick={() => responder(true)} className="tap"
                  style={{padding:'16px',borderRadius:14,fontWeight:700,fontSize:'0.88rem',cursor:'pointer',background:'rgba(52,211,153,0.1)',color:'#34D399',border:'1px solid rgba(52,211,153,0.25)'}}>
                  ✓ Sabia!
                </button>
              </div>
            ) : (
              <div style={{textAlign:'center',color:'#3F3F46',fontSize:'0.75rem'}}>
                Toque no card para ver a resposta
              </div>
            )}
          </>
        )}

        {/* FIM */}
        {fase === 'fim' && (
          <div style={{minHeight:'70vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',gap:16}}>
            <div style={{fontSize:'3.5rem',marginBottom:8}}>
              {acertos / cards.length >= 0.8 ? '🎉' : acertos / cards.length >= 0.5 ? '💪' : '📚'}
            </div>
            <div>
              <div style={{fontSize:'2.5rem',fontWeight:900,letterSpacing:'-0.04em',
                color: acertos/cards.length>=0.8?'#34D399':acertos/cards.length>=0.5?'#FBBF24':'#F87171'}}>
                {Math.round((acertos/cards.length)*100)}%
              </div>
              <div style={{fontSize:'0.82rem',color:'#52525B',marginTop:4}}>
                {acertos} acertos de {cards.length} cards
              </div>
            </div>
            <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:'14px 20px',fontSize:'0.78rem',color:'#A1A1AA'}}>
              {acertos/cards.length >= 0.8
                ? 'Excelente! Os cards serão revisados em mais dias.'
                : 'Os cards que você errou voltam amanhã para revisão.'}
            </div>
            <div style={{display:'flex',gap:12,marginTop:8}}>
              <button onClick={() => setFase('menu')} className="tap"
                style={{padding:'13px 20px',borderRadius:12,fontWeight:700,fontSize:'0.85rem',cursor:'pointer',
                  background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.09)',color:'#E4E4E7'}}>
                Voltar
              </button>
              <Link href="/simulado">
                <button className="tap"
                  style={{padding:'13px 20px',borderRadius:12,fontWeight:800,fontSize:'0.85rem',cursor:'pointer',
                    background:'linear-gradient(135deg,#6366F1,#818CF8)',color:'#fff',border:'none'}}>
                  Fazer simulado →
                </button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
