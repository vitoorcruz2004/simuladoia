'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { BADGES, comprarStreakFreeze } from '@/lib/gamificacao'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Desempenho { area: string; percentual: number; total_respondidas: number }
interface Simulado { id: string; created_at: string; percentual: number; total_questoes: number; acertos: number }
interface Gamificacao {
  pontos: number; streak_atual: number; streak_maximo: number
  total_simulados: number; total_redacoes: number; badges: string[]
  meta_diaria: number; questoes_hoje: number; streak_freeze: number
}

const AREA_COLORS: Record<string, string> = {
  'Matemática': '#6366F1', 'Linguagens': '#22d3a0',
  'Ciências Humanas': '#f59e0b', 'Ciências da Natureza': '#3b82f6',
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [desempenho, setDesempenho] = useState<Desempenho[]>([])
  const [simulados, setSimulados] = useState<Simulado[]>([])
  const [gam, setGam] = useState<Gamificacao | null>(null)
  const [totalErradas, setTotalErradas] = useState(0)
  const [loading, setLoading] = useState(true)
  const [comprando, setComprando] = useState(false)
  const [freezeMsg, setFreezeMsg] = useState('')
  const [celebrar, setCelebrar] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Verifica se veio de um simulado completado
    const params = new URLSearchParams(window.location.search)
    if (params.get('celebrar')) { setCelebrar(true); setTimeout(() => setCelebrar(false), 4000) }
  }, [])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      setUser(user)

      const [{ data: desemp }, { data: sims }, { data: g }, { data: erradas }] = await Promise.all([
        supabase.from('desempenho').select('*').eq('user_id', user.id).order('percentual'),
        supabase.from('simulados').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('gamificacao').select('*').eq('user_id', user.id).single(),
        supabase.from('questoes_erradas').select('id').eq('user_id', user.id),
      ])

      setDesempenho(desemp || [])
      setSimulados(sims || [])
      setGam(g || null)
      setTotalErradas(erradas?.length || 0)
      setLoading(false)
    }
    load()
  }, [])

  async function handleComprarFreeze() {
    if (!user || comprando) return
    setComprando(true)
    const ok = await comprarStreakFreeze(user.id)
    if (ok) {
      setFreezeMsg('✓ Streak Freeze comprado! Você está protegido por 1 dia.')
      const { data: g } = await supabase.from('gamificacao').select('*').eq('user_id', user.id).single()
      setGam(g)
    } else {
      setFreezeMsg('Pontos insuficientes. Você precisa de 50 pontos.')
    }
    setComprando(false)
    setTimeout(() => setFreezeMsg(''), 3000)
  }

  async function sair() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  const notaGeral = desempenho.length ? Math.round(desempenho.reduce((acc, d) => acc + d.percentual, 0) / desempenho.length) : 0
  const totalQuestoes = desempenho.reduce((acc, d) => acc + d.total_respondidas, 0)
  const piorArea = desempenho[0]
  const badgesDesbloqueados = gam ? BADGES.filter(b => gam.badges?.includes(b.id)) : []
  const metaProgresso = gam ? Math.min(100, Math.round(((gam.questoes_hoje || 0) / (gam.meta_diaria || 10)) * 100)) : 0
  const metaAtingida = gam && (gam.questoes_hoje || 0) >= (gam.meta_diaria || 10)

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'#09090B'}}>
      <div className="text-zinc-400 text-sm">Carregando...</div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{background:'#09090B'}}>
      {/* CELEBRAÇÃO */}
      {celebrar && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
          <div className="text-center animate-bounce">
            <div className="text-6xl mb-2">🎉</div>
            <div className="text-white font-bold text-xl">Simulado concluído!</div>
          </div>
          {[...Array(20)].map((_, i) => (
            <div key={i} className="absolute text-2xl" style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `fall ${1 + Math.random() * 2}s ease-in forwards`,
              animationDelay: `${Math.random() * 0.5}s`
            }}>
              {['🎊', '⭐', '🔥', '💫', '✨'][Math.floor(Math.random() * 5)]}
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes fall { from { transform: translateY(-20px) rotate(0deg); opacity: 1; } to { transform: translateY(100vh) rotate(360deg); opacity: 0; } }
      `}</style>

      <nav className="border-b border-zinc-800 px-8 h-14 flex items-center justify-between" style={{background:'#09090B'}}>
        <div className="text-lg font-extrabold tracking-tight">Simulado<span style={{color:'#818CF8'}}>IA</span></div>
        <div className="flex items-center gap-4">
          <span className="text-zinc-500 text-sm hidden sm:block">{user?.email}</span>
          <button onClick={sair} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Sair</button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* STREAK HERO — destaque máximo */}
        {gam && (
          <div className="rounded-2xl p-6 mb-6 relative overflow-hidden"
            style={{background: gam.streak_atual >= 3 ? 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(239,68,68,0.08))' : 'rgba(17,17,19,1)', border: gam.streak_atual >= 3 ? '1px solid rgba(245,158,11,0.3)' : '1px solid #27272A'}}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="text-5xl">{gam.streak_atual >= 7 ? '🔥' : gam.streak_atual >= 3 ? '🔥' : '⚡'}</div>
                  {gam.streak_freeze > 0 && (
                    <div className="absolute -top-1 -right-1 text-xs">🛡️</div>
                  )}
                </div>
                <div>
                  <div className="text-4xl font-extrabold tracking-tight" style={{color: gam.streak_atual >= 3 ? '#f59e0b' : '#FAFAFA'}}>
                    {gam.streak_atual} <span className="text-lg text-zinc-400 font-normal">dias seguidos</span>
                  </div>
                  <div className="text-sm text-zinc-500 mt-0.5">Recorde: {gam.streak_maximo} dias · {gam.pontos} pontos</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-zinc-500 mb-1">Streak Freeze</div>
                <div className="text-2xl font-bold">{gam.streak_freeze > 0 ? `🛡️ ${gam.streak_freeze}` : '—'}</div>
                <button
                  onClick={handleComprarFreeze}
                  disabled={comprando || (gam.pontos < 50)}
                  className="text-xs mt-1 px-3 py-1.5 rounded-full transition-all"
                  style={{
                    background: gam.pontos >= 50 ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                    color: gam.pontos >= 50 ? '#818CF8' : '#52525B',
                    border: `1px solid ${gam.pontos >= 50 ? 'rgba(99,102,241,0.3)' : '#27272A'}`,
                    cursor: gam.pontos >= 50 ? 'pointer' : 'not-allowed'
                  }}>
                  {comprando ? '...' : `Comprar (50 pts)`}
                </button>
              </div>
            </div>

            {/* META DIÁRIA */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-zinc-400">Meta diária</span>
                <span className={metaAtingida ? 'font-bold' : 'text-zinc-400'} style={{color: metaAtingida ? '#22d3a0' : undefined}}>
                  {metaAtingida ? '✓ Meta atingida!' : `${gam.questoes_hoje || 0}/${gam.meta_diaria || 10} questões`}
                </span>
              </div>
              <div className="h-3 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.06)'}}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{width:`${metaProgresso}%`, background: metaAtingida ? '#22d3a0' : 'linear-gradient(90deg, #6366F1, #818CF8)'}}/>
              </div>
            </div>

            {freezeMsg && (
              <div className="mt-3 text-xs text-center py-2 rounded-lg" style={{background:'rgba(99,102,241,0.1)', color:'#818CF8'}}>
                {freezeMsg}
              </div>
            )}
          </div>
        )}

        {/* STATS */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl border border-zinc-800 p-5" style={{background:'#111113'}}>
            <div className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Aproveitamento</div>
            <div className="text-3xl font-extrabold tracking-tight" style={{color: notaGeral >= 70 ? '#22d3a0' : notaGeral >= 50 ? '#f59e0b' : '#f87171'}}>
              {notaGeral}<span className="text-lg text-zinc-500">%</span>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-800 p-5" style={{background:'#111113'}}>
            <div className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Simulados</div>
            <div className="text-3xl font-extrabold tracking-tight">{simulados.length}</div>
          </div>
          <div className="rounded-xl border border-zinc-800 p-5" style={{background:'#111113'}}>
            <div className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Maior gap</div>
            <div className="text-lg font-bold" style={{color:'#f87171'}}>{piorArea ? piorArea.area : '—'}</div>
            {piorArea && <div className="text-xs text-zinc-500 mt-1">{Math.round(piorArea.percentual)}% acerto</div>}
          </div>
        </div>

        {/* BADGES */}
        {badgesDesbloqueados.length > 0 && (
          <div className="rounded-xl border border-zinc-800 p-5 mb-6" style={{background:'#111113'}}>
            <div className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Conquistas</div>
            <div className="flex flex-wrap gap-3">
              {badgesDesbloqueados.map(b => (
                <div key={b.id} className="flex items-center gap-2 px-3 py-2 rounded-full"
                  style={{background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)'}}>
                  <span className="text-lg">{b.emoji}</span>
                  <span className="text-xs font-medium" style={{color:'#818CF8'}}>{b.nome}</span>
                </div>
              ))}
              {BADGES.filter(b => !gam?.badges?.includes(b.id)).slice(0, 2).map(b => (
                <div key={b.id} className="flex items-center gap-2 px-3 py-2 rounded-full opacity-30"
                  style={{background:'#18181B', border:'1px solid #27272A'}}>
                  <span className="text-lg grayscale">{b.emoji}</span>
                  <span className="text-xs text-zinc-600">{b.nome}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DESEMPENHO */}
        {desempenho.length > 0 && (
          <div className="rounded-xl border border-zinc-800 p-6 mb-6" style={{background:'#111113'}}>
            <h2 className="text-sm font-semibold text-zinc-300 mb-5">Desempenho por área</h2>
            <div className="flex flex-col gap-4">
              {desempenho.map(d => (
                <div key={d.area}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-zinc-300">{d.area}</span>
                    <span className="font-semibold" style={{color: AREA_COLORS[d.area] || '#818CF8'}}>{Math.round(d.percentual)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{width:`${d.percentual}%`, background: AREA_COLORS[d.area] || '#6366F1'}}/>
                  </div>
                  <div className="text-xs text-zinc-600 mt-1">{d.total_respondidas} questões</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* HISTÓRICO */}
        {simulados.length > 0 && (
          <div className="rounded-xl border border-zinc-800 p-6 mb-6" style={{background:'#111113'}}>
            <h2 className="text-sm font-semibold text-zinc-300 mb-4">Últimos simulados</h2>
            <div className="flex flex-col gap-2">
              {simulados.map(s => (
                <div key={s.id} className="flex items-center justify-between py-3 border-b border-zinc-800 last:border-0">
                  <div>
                    <div className="text-sm text-zinc-300">{s.total_questoes} questões</div>
                    <div className="text-xs text-zinc-600">{new Date(s.created_at).toLocaleDateString('pt-BR')}</div>
                  </div>
                  <div className="font-bold" style={{color: s.percentual >= 70 ? '#22d3a0' : s.percentual >= 50 ? '#f59e0b' : '#f87171'}}>
                    {Math.round(s.percentual)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AÇÕES */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Link href="/simulado">
            <button className="w-full py-4 rounded-xl font-bold text-sm transition-all hover:opacity-90" style={{background:'#6366F1', color:'#fff'}}>
              {totalQuestoes === 0 ? 'Primeiro simulado →' : 'Novo simulado →'}
            </button>
          </Link>
          <Link href="/redacao">
            <button className="w-full py-4 rounded-xl font-bold text-sm border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-all">
              Treinar redação →
            </button>
          </Link>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <Link href="/revisao">
            <button className="w-full py-3 rounded-xl text-xs font-semibold border border-zinc-700 hover:bg-zinc-800 transition-all"
              style={{color: totalErradas > 0 ? '#f59e0b' : '#71717A'}}>
              🔄 Revisão{totalErradas > 0 ? ` (${totalErradas})` : ''}
            </button>
          </Link>
          <Link href="/plano">
            <button className="w-full py-3 rounded-xl text-xs font-semibold border border-zinc-700 text-zinc-400 hover:bg-zinc-800 transition-all">
              📅 Plano
            </button>
          </Link>
          <Link href="/sisu">
            <button className="w-full py-3 rounded-xl text-xs font-semibold border border-zinc-700 text-zinc-400 hover:bg-zinc-800 transition-all">
              🎓 SiSU
            </button>
          </Link>
          <Link href="/leaderboard">
            <button className="w-full py-3 rounded-xl text-xs font-semibold border border-zinc-700 text-zinc-400 hover:bg-zinc-800 transition-all">
              🏆 Ranking
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}
