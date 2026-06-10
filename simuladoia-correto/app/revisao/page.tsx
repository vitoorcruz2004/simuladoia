'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Questao {
  id: string
  area: string
  subarea: string
  enunciado: string
  alternativas: { letra: string; texto: string }[]
  resposta_correta: string
  explicacao: string
  vezes_errada: number
}

export default function Revisao() {
  const [user, setUser] = useState<any>(null)
  const [questoes, setQuestoes] = useState<Questao[]>([])
  const [atual, setAtual] = useState(0)
  const [resposta, setResposta] = useState<string | null>(null)
  const [respondida, setRespondida] = useState(false)
  const [loading, setLoading] = useState(true)
  const [fase, setFase] = useState<'revisao' | 'vazio' | 'fim'>('revisao')
  const [acertos, setAcertos] = useState(0)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      setUser(user)

      const { data: erradas } = await supabase
        .from('questoes_erradas')
        .select('questao_id, vezes_errada')
        .eq('user_id', user.id)
        .order('vezes_errada', { ascending: false })
        .limit(15)

      if (!erradas || erradas.length === 0) {
        setFase('vazio')
        setLoading(false)
        return
      }

      const ids = erradas.map(e => e.questao_id)
      const { data: qs } = await supabase
        .from('questoes')
        .select('*')
        .in('id', ids)

      if (qs) {
        const com_vezes = qs.map(q => ({
          ...q,
          vezes_errada: erradas.find(e => e.questao_id === q.id)?.vezes_errada || 1
        })).sort((a, b) => b.vezes_errada - a.vezes_errada)
        setQuestoes(com_vezes)
      }
      setLoading(false)
    }
    load()
  }, [])

  async function confirmar() {
    if (!resposta || respondida) return
    setRespondida(true)
    const q = questoes[atual]
    if (resposta === q.resposta_correta) {
      setAcertos(a => a + 1)
      // remove da lista de erradas se acertou
      await supabase.from('questoes_erradas')
        .delete()
        .eq('user_id', user.id)
        .eq('questao_id', q.id)
    }
  }

  function proxima() {
    if (atual < questoes.length - 1) {
      setAtual(a => a + 1)
      setResposta(null)
      setRespondida(false)
    } else {
      setFase('fim')
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'#09090B'}}>
      <div className="text-zinc-400 text-sm">Carregando suas questões erradas...</div>
    </div>
  )

  if (fase === 'vazio') return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{background:'#09090B'}}>
      <div className="text-center max-w-sm">
        <div className="text-4xl mb-4">🎉</div>
        <h2 className="text-xl font-bold mb-2">Nenhuma questão pra revisar!</h2>
        <p className="text-zinc-400 text-sm mb-6">Você ainda não errou nenhuma questão, ou já revisou tudo. Faça um simulado primeiro.</p>
        <Link href="/simulado">
          <button className="px-6 py-3 rounded-xl font-bold text-sm" style={{background:'#6366F1', color:'#fff'}}>
            Fazer simulado →
          </button>
        </Link>
      </div>
    </div>
  )

  if (fase === 'fim') return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{background:'#09090B'}}>
      <div className="text-center max-w-sm">
        <div className="text-5xl font-extrabold mb-2" style={{color: acertos/questoes.length >= 0.7 ? '#22d3a0' : '#f87171'}}>
          {Math.round((acertos/questoes.length)*100)}%
        </div>
        <p className="text-zinc-400 text-sm mb-2">{acertos} de {questoes.length} acertos na revisão</p>
        <p className="text-xs text-zinc-600 mb-6">As questões que você acertou foram removidas da sua lista de revisão.</p>
        <div className="flex gap-3">
          <Link href="/dashboard">
            <button className="px-4 py-3 rounded-xl text-sm font-semibold border border-zinc-700 text-zinc-300">
              Dashboard
            </button>
          </Link>
          <Link href="/simulado">
            <button className="px-4 py-3 rounded-xl font-bold text-sm" style={{background:'#6366F1', color:'#fff'}}>
              Novo simulado →
            </button>
          </Link>
        </div>
      </div>
    </div>
  )

  const q = questoes[atual]

  return (
    <div className="min-h-screen" style={{background:'#09090B'}}>
      <div className="h-1 bg-zinc-800">
        <div className="h-full transition-all" style={{width:`${(atual/questoes.length)*100}%`, background:'#f59e0b'}}/>
      </div>

      <nav className="border-b border-zinc-800 px-8 h-14 flex items-center justify-between">
        <Link href="/dashboard">
          <div className="text-lg font-extrabold tracking-tight cursor-pointer">
            Simulado<span style={{color:'#818CF8'}}>IA</span>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs px-3 py-1 rounded-full" style={{background:'rgba(245,158,11,0.1)', color:'#f59e0b', border:'1px solid rgba(245,158,11,0.2)'}}>
            🔄 Modo Revisão
          </span>
          <span className="text-sm text-zinc-500">{atual + 1}/{questoes.length}</span>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-xs px-2 py-1 rounded-full" style={{background:'rgba(245,158,11,0.1)', color:'#f59e0b', border:'1px solid rgba(245,158,11,0.2)'}}>
            {q.area}
          </span>
          <span className="text-xs text-zinc-600">Errada {q.vezes_errada}x</span>
        </div>

        <div className="rounded-xl border border-zinc-800 p-6 mb-6" style={{background:'#111113'}}>
          <p className="text-sm text-zinc-500 mb-3 uppercase tracking-widest">{q.subarea}</p>
          <p className="text-base leading-relaxed text-zinc-100">{q.enunciado}</p>
        </div>

        <div className="flex flex-col gap-3 mb-6">
          {q.alternativas.map(alt => {
            let estilo: React.CSSProperties = { background:'#111113', border:'1px solid #27272A', color:'#A1A1AA' }
            if (resposta === alt.letra && !respondida) estilo = { background:'#6366F10d', border:'1px solid #6366F1', color:'#FAFAFA' }
            if (respondida) {
              if (alt.letra === q.resposta_correta) estilo = { background:'rgba(34,211,160,0.08)', border:'1px solid rgba(34,211,160,0.4)', color:'#22d3a0' }
              else if (alt.letra === resposta) estilo = { background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.4)', color:'#f87171' }
            }
            return (
              <button key={alt.letra} onClick={() => !respondida && setResposta(alt.letra)}
                className="w-full text-left px-4 py-3 rounded-xl flex gap-3 transition-all text-sm" style={estilo}>
                <span className="font-bold opacity-50 min-w-[20px]">{alt.letra}</span>
                <span className="leading-relaxed">{alt.texto}</span>
              </button>
            )
          })}
        </div>

        {respondida && (
          <div className="rounded-xl p-4 mb-6 text-sm leading-relaxed"
            style={{background: resposta === q.resposta_correta ? 'rgba(34,211,160,0.06)' : 'rgba(248,113,113,0.06)',
              border: `1px solid ${resposta === q.resposta_correta ? 'rgba(34,211,160,0.2)' : 'rgba(248,113,113,0.2)'}`,
              color:'#A1A1AA'}}>
            <span className="font-semibold text-zinc-200">Explicação: </span>{q.explicacao}
          </div>
        )}

        {!respondida ? (
          <button onClick={confirmar} disabled={!resposta}
            className="w-full py-4 rounded-xl font-bold text-sm transition-all"
            style={{ background: resposta ? '#f59e0b' : '#18181B', color: resposta ? '#000' : '#52525B', cursor: resposta ? 'pointer' : 'not-allowed' }}>
            Confirmar resposta
          </button>
        ) : (
          <button onClick={proxima} className="w-full py-4 rounded-xl font-bold text-sm transition-all hover:opacity-90"
            style={{background:'#6366F1', color:'#fff'}}>
            {atual < questoes.length - 1 ? 'Próxima →' : 'Ver resultado →'}
          </button>
        )}
      </div>
    </div>
  )
}
