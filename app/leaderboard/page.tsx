'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Entry { user_id: string; nome: string; pontos_semana: number }

function getSemana() {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const week = Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7)
  return `${now.getFullYear()}-W${week}`
}

const MEDALS = ['🥇', '🥈', '🥉']

export default function Leaderboard() {
  const [user, setUser] = useState<any>(null)
  const [ranking, setRanking] = useState<Entry[]>([])
  const [minhaPosicao, setMinhaPosicao] = useState<number>(-1)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      setUser(user)

      const semana = getSemana()
      const { data } = await supabase
        .from('leaderboard')
        .select('user_id, nome, pontos_semana')
        .eq('semana', semana)
        .order('pontos_semana', { ascending: false })
        .limit(20)

      const entries = data || []
      setRanking(entries)
      const pos = entries.findIndex(e => e.user_id === user.id)
      setMinhaPosicao(pos)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'#09090B'}}>
      <div className="text-zinc-400 text-sm">Carregando ranking...</div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{background:'#09090B'}}>
      <nav className="border-b border-zinc-800 px-8 h-14 flex items-center justify-between">
        <Link href="/dashboard">
          <div className="text-lg font-extrabold tracking-tight cursor-pointer">Simulado<span style={{color:'#818CF8'}}>IA</span></div>
        </Link>
        <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">← Voltar</Link>
      </nav>

      <div className="max-w-lg mx-auto px-6 py-10">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight">🏆 Ranking Semanal</h1>
          <p className="text-zinc-400 text-sm mt-1">Quem mais estudou essa semana</p>
        </div>

        {ranking.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">🏁</div>
            <p className="text-zinc-400 text-sm mb-2">Ninguém no ranking ainda essa semana.</p>
            <p className="text-zinc-600 text-xs">Faça um simulado e apareça aqui!</p>
            <Link href="/simulado">
              <button className="mt-6 px-6 py-3 rounded-xl font-bold text-sm" style={{background:'#6366F1', color:'#fff'}}>
                Fazer simulado →
              </button>
            </Link>
          </div>
        ) : (
          <>
            {/* TOP 3 */}
            <div className="flex justify-center items-end gap-4 mb-8">
              {ranking[1] && (
                <div className="text-center flex-1">
                  <div className="text-3xl mb-1">🥈</div>
                  <div className="rounded-xl border border-zinc-800 p-3 mx-auto" style={{background:'#111113', height:'80px', display:'flex', flexDirection:'column', justifyContent:'center'}}>
                    <div className="font-bold text-sm truncate">{ranking[1].nome || 'Anônimo'}</div>
                    <div className="text-xs text-zinc-500">{ranking[1].pontos_semana} pts</div>
                  </div>
                </div>
              )}
              {ranking[0] && (
                <div className="text-center flex-1">
                  <div className="text-4xl mb-1">🥇</div>
                  <div className="rounded-xl border p-3 mx-auto" style={{background:'rgba(99,102,241,0.1)', borderColor:'rgba(99,102,241,0.3)', height:'96px', display:'flex', flexDirection:'column', justifyContent:'center'}}>
                    <div className="font-bold text-sm truncate">{ranking[0].nome || 'Anônimo'}</div>
                    <div className="text-xs" style={{color:'#818CF8'}}>{ranking[0].pontos_semana} pts</div>
                  </div>
                </div>
              )}
              {ranking[2] && (
                <div className="text-center flex-1">
                  <div className="text-3xl mb-1">🥉</div>
                  <div className="rounded-xl border border-zinc-800 p-3 mx-auto" style={{background:'#111113', height:'72px', display:'flex', flexDirection:'column', justifyContent:'center'}}>
                    <div className="font-bold text-sm truncate">{ranking[2].nome || 'Anônimo'}</div>
                    <div className="text-xs text-zinc-500">{ranking[2].pontos_semana} pts</div>
                  </div>
                </div>
              )}
            </div>

            {/* LISTA COMPLETA */}
            <div className="flex flex-col gap-2">
              {ranking.map((entry, i) => (
                <div key={entry.user_id}
                  className="flex items-center gap-4 p-4 rounded-xl border transition-all"
                  style={{
                    background: entry.user_id === user?.id ? 'rgba(99,102,241,0.08)' : '#111113',
                    borderColor: entry.user_id === user?.id ? 'rgba(99,102,241,0.3)' : '#27272A',
                  }}>
                  <div className="text-lg w-8 text-center">
                    {i < 3 ? MEDALS[i] : <span className="text-zinc-500 text-sm font-bold">{i + 1}</span>}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">
                      {entry.nome || 'Anônimo'}
                      {entry.user_id === user?.id && <span className="text-xs ml-2" style={{color:'#818CF8'}}>você</span>}
                    </div>
                  </div>
                  <div className="font-bold text-sm" style={{color: i === 0 ? '#f59e0b' : '#818CF8'}}>
                    {entry.pontos_semana} pts
                  </div>
                </div>
              ))}
            </div>

            {minhaPosicao === -1 && (
              <div className="mt-6 rounded-xl border border-dashed border-zinc-700 p-4 text-center">
                <p className="text-zinc-500 text-sm">Você ainda não está no ranking essa semana.</p>
                <Link href="/simulado">
                  <button className="mt-3 px-5 py-2 rounded-lg text-sm font-bold" style={{background:'#6366F1', color:'#fff'}}>
                    Entrar no ranking →
                  </button>
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
