'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { BADGES } from '@/lib/gamificacao'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Desempenho { area: string; percentual: number; total_respondidas: number }
interface Simulado { id: string; created_at: string; percentual: number; total_questoes: number; acertos: number }
interface Gamificacao { pontos: number; streak_atual: number; streak_maximo: number; total_simulados: number; total_redacoes: number; badges: string[] }

const AREA_COLORS: Record<string, string> = {
  'Matemática': '#6366F1',
  'Linguagens': '#22d3a0',
  'Ciências Humanas': '#f59e0b',
  'Ciências da Natureza': '#3b82f6',
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [desempenho, setDesempenho] = useState<Desempenho[]>([])
  const [simulados, setSimulados] = useState<Simulado[]>([])
  const [gamificacao, setGamificacao] = useState<Gamificacao | null>(null)
  const [totalErradas, setTotalErradas] = useState(0)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      setUser(user)

      const [{ data: desemp }, { data: sims }, { data: gam }, { data: erradas }] = await Promise.all([
        supabase.from('desempenho').select('*').eq('user_id', user.id).order('percentual'),
        supabase.from('simulados').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('gamificacao').select('*').eq('user_id', user.id).single(),
        supabase.from('questoes_erradas').select('id').eq('user_id', user.id),
      ])

      setDesempenho(desemp || [])
      setSimulados(sims || [])
      setGamificacao(gam || null)
      setTotalErradas(erradas?.length || 0)
      setLoading(false)
    }
    load()
  }, [])

  async function sair() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  const notaGeral = desempenho.length ? Math.round(desempenho.reduce((acc, d) => acc + d.percentual, 0) / desempenho.length) : 0
  const totalQuestoes = desempenho.reduce((acc, d) => acc + d.total_respondidas, 0)
  const piorArea = desempenho[0]
  const badgesDesbloqueados = gamificacao ? BADGES.filter(b => gamificacao.badges?.includes(b.id)) : []

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'#09090B'}}>
      <div className="text-zinc-400 text-sm">Carregando...</div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{background:'#09090B'}}>
      <nav className="border-b border-zinc-800 px-8 h-14 flex items-center justify-between" style={{background:'#09090B'}}>
        <div className="text-lg font-extrabold tracking-tight">Simulado<span style={{color:'#818CF8'}}>IA</span></div>
        <div className="flex items-center gap-4">
          <span className="text-zinc-500 text-sm hidden sm:block">{user?.email}</span>
          <button onClick={sair} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Sair</button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Seu painel</h1>
          <p className="text-zinc-400 text-sm mt-1">
            {totalQuestoes === 0 ? 'Faça seu primeiro simulado para ver seu progresso.' : `${totalQuestoes} questões respondidas no total.`}
          </p>
        </div>

        {/* GAMIFICAÇÃO */}
        {gamificacao && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="rounded-xl border border-zinc-800 p-4 flex items-center gap-3" style={{background:'#111113'}}>
              <div className="text-3xl">🔥</div>
              <div>
                <div className="text-2xl font-extrabold tracking-tight" style={{color:'#f59e0b'}}>{gamificacao.streak_atual}</div>
                <div className="text-xs text-zinc-500">dias seguidos</div>
                <div className="text-xs text-zinc-600">recorde: {gamificacao.streak_maximo}</div>
              </div>
            </div>
            <div className="rounded-xl border border-zinc-800 p-4 flex items-center gap-3" style={{background:'#111113'}}>
              <div className="text-3xl">⚡</div>
              <div>
                <div className="text-2xl font-extrabold tracking-tight" style={{color:'#818CF8'}}>{gamificacao.pontos}</div>
                <div className="text-xs text-zinc-500">pontos totais</div>
                <div className="text-xs text-zinc-600">{gamificacao.total_simulados} simulados</div>
              </div>
            </div>
            <div className="rounded-xl border border-zinc-800 p-4" style={{background:'#111113'}}>
              <div className="text-xs text-zinc-500 mb-2">Badges conquistados</div>
              <div className="flex flex-wrap gap-1">
                {badgesDesbloqueados.length > 0 ? (
                  badgesDesbloqueados.map(b => (
                    <span key={b.id} title={b.descricao} className="text-xl cursor-help">{b.emoji}</span>
                  ))
                ) : (
                  <span className="text-xs text-zinc-600">Faça um simulado pra ganhar badges</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STATS */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl border border-zinc-800 p-5" style={{background:'#111113'}}>
            <div className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Aproveitamento geral</div>
            <div className="text-3xl font-extrabold tracking-tight" style={{color: notaGeral >= 70 ? '#22d3a0' : notaGeral >= 50 ? '#f59e0b' : '#f87171'}}>
              {notaGeral}<span className="text-lg text-zinc-500">%</span>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-800 p-5" style={{background:'#111113'}}>
            <div className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Simulados feitos</div>
            <div className="text-3xl font-extrabold tracking-tight">{simulados.length}</div>
          </div>
          <div className="rounded-xl border border-zinc-800 p-5" style={{background:'#111113'}}>
            <div className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Maior gap</div>
            <div className="text-lg font-bold tracking-tight" style={{color:'#f87171'}}>
              {piorArea ? piorArea.area : '—'}
            </div>
            {piorArea && <div className="text-xs text-zinc-500 mt-1">{Math.round(piorArea.percentual)}% de acerto</div>}
          </div>
        </div>

        {/* DESEMPENHO POR ÁREA */}
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
                  <div className="text-xs text-zinc-600 mt-1">{d.total_respondidas} questões respondidas</div>
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
                  <div className="text-right">
                    <div className="font-bold" style={{color: s.percentual >= 70 ? '#22d3a0' : s.percentual >= 50 ? '#f59e0b' : '#f87171'}}>
                      {Math.round(s.percentual)}%
                    </div>
                    <div className="text-xs text-zinc-600">{s.acertos}/{s.total_questoes} acertos</div>
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
        <div className="grid grid-cols-3 gap-3">
          <Link href="/revisao">
            <button className="w-full py-3 rounded-xl text-sm font-semibold border border-zinc-700 hover:bg-zinc-800 transition-all"
              style={{color: totalErradas > 0 ? '#f59e0b' : '#71717A'}}>
              🔄 Revisão {totalErradas > 0 ? `(${totalErradas})` : ''}
            </button>
          </Link>
          <Link href="/plano">
            <button className="w-full py-3 rounded-xl text-sm font-semibold border border-zinc-700 text-zinc-400 hover:bg-zinc-800 transition-all">
              📅 Plano
            </button>
          </Link>
          <Link href="/sisu">
            <button className="w-full py-3 rounded-xl text-sm font-semibold border border-zinc-700 text-zinc-400 hover:bg-zinc-800 transition-all">
              🎓 SiSU
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}
