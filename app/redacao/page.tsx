'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Competencia {
  numero: number
  nome: string
  nota: number
  feedback: string
}

interface Correcao {
  nota_total: number
  competencias: Competencia[]
  pontos_fortes: string[]
  pontos_melhora: string[]
  comentario_geral: string
}

interface HistoricoRedacao {
  id: string
  tema: string
  nota_total: number
  created_at: string
}

const TEMAS_SUGERIDOS = [
  'Desafios para a valorização de comunidades e povos tradicionais no Brasil',
  'O impacto das redes sociais na saúde mental dos jovens',
  'Invisibilidade e registro civil: garantia de acesso à cidadania no Brasil',
  'Manipulação do comportamento do usuário pelo controle de dados na internet',
  'A persistência da violência contra a mulher na sociedade brasileira',
  'Estigmas relacionados às doenças mentais na sociedade brasileira',
]

export default function Redacao() {
  const [user, setUser] = useState<any>(null)
  const [tema, setTema] = useState('')
  const [texto, setTexto] = useState('')
  const [correcao, setCorrecao] = useState<Correcao | null>(null)
  const [historico, setHistorico] = useState<HistoricoRedacao[]>([])
  const [loading, setLoading] = useState(false)
  const [fase, setFase] = useState<'escrever' | 'correcao' | 'historico'>('escrever')
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      setUser(user)
      const { data } = await supabase
        .from('redacoes')
        .select('id, tema, nota_total, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)
      setHistorico(data || [])
    }
    load()
  }, [])

  const palavras = texto.trim().split(/\s+/).filter(w => w.length > 0).length

  async function corrigir() {
    if (!tema || texto.length < 100) return
    setLoading(true)

    try {
      const res = await fetch('/api/redacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tema, texto })
      })
      const data = await res.json()
      if (data.correcao) {
        setCorrecao(data.correcao)

        // salva no banco
        if (user) {
          await supabase.from('redacoes').insert({
            user_id: user.id,
            tema,
            texto,
            nota_total: data.correcao.nota_total,
            correcao: data.correcao,
          })
        }

        setFase('correcao')
      }
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const notaCor = (nota: number) => {
    if (nota >= 160) return '#22d3a0'
    if (nota >= 120) return '#f59e0b'
    return '#f87171'
  }

  return (
    <div className="min-h-screen" style={{background:'#09090B'}}>
      <nav className="border-b border-zinc-800 px-8 h-14 flex items-center justify-between">
        <Link href="/dashboard">
          <div className="text-lg font-extrabold tracking-tight cursor-pointer">
            Simulado<span style={{color:'#818CF8'}}>IA</span>
          </div>
        </Link>
        <div className="flex gap-4 text-sm text-zinc-500">
          <Link href="/dashboard" className="hover:text-zinc-300 transition-colors">Dashboard</Link>
          <Link href="/simulado" className="hover:text-zinc-300 transition-colors">Simulado</Link>
          <Link href="/plano" className="hover:text-zinc-300 transition-colors">Plano</Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* TABS */}
        <div className="flex gap-1 mb-8 p-1 rounded-lg" style={{background:'#111113', border:'1px solid #27272A', width:'fit-content'}}>
          {[
            { key: 'escrever', label: 'Escrever' },
            { key: 'historico', label: `Histórico (${historico.length})` },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => { setFase(tab.key as any); if (tab.key === 'escrever') setCorrecao(null) }}
              className="px-4 py-2 rounded-md text-sm font-medium transition-all"
              style={{
                background: fase === tab.key || (fase === 'correcao' && tab.key === 'escrever') ? '#27272A' : 'transparent',
                color: fase === tab.key || (fase === 'correcao' && tab.key === 'escrever') ? '#FAFAFA' : '#71717A'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ESCREVER */}
        {(fase === 'escrever') && (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight">Redação</h1>
              <p className="text-zinc-400 text-sm mt-1">Escreva sua redação e receba correção detalhada nas 5 competências do ENEM.</p>
            </div>

            {/* TEMA */}
            <div className="rounded-xl border border-zinc-800 p-5 mb-4" style={{background:'#111113'}}>
              <label className="text-sm font-semibold text-zinc-300 mb-3 block">Tema da redação</label>
              <input
                type="text"
                value={tema}
                onChange={e => setTema(e.target.value)}
                placeholder="Digite o tema ou escolha um sugerido abaixo"
                className="w-full px-4 py-3 rounded-lg text-sm outline-none mb-3"
                style={{background:'#18181B', border:'1px solid #27272A', color:'#FAFAFA'}}
              />
              <div className="flex flex-wrap gap-2">
                {TEMAS_SUGERIDOS.map((t, i) => (
                  <button
                    key={i}
                    onClick={() => setTema(t)}
                    className="text-xs px-3 py-1.5 rounded-full transition-all text-left"
                    style={{
                      background: tema === t ? 'rgba(99,102,241,0.15)' : '#18181B',
                      border: tema === t ? '1px solid rgba(99,102,241,0.4)' : '1px solid #27272A',
                      color: tema === t ? '#818CF8' : '#71717A'
                    }}
                  >
                    {t.length > 50 ? t.substring(0, 50) + '...' : t}
                  </button>
                ))}
              </div>
            </div>

            {/* TEXTO */}
            <div className="rounded-xl border border-zinc-800 overflow-hidden mb-4" style={{background:'#111113'}}>
              <div className="px-4 py-2 border-b border-zinc-800 flex justify-between items-center">
                <span className="text-xs text-zinc-500">Sua redação</span>
                <span className="text-xs" style={{color: palavras >= 150 && palavras <= 350 ? '#22d3a0' : '#f59e0b'}}>
                  {palavras} palavras {palavras < 150 ? '(mínimo 150)' : palavras > 350 ? '(máximo recomendado: 350)' : '✓'}
                </span>
              </div>
              <textarea
                value={texto}
                onChange={e => setTexto(e.target.value)}
                placeholder="Escreva sua redação aqui. O texto dissertativo-argumentativo deve ter introdução, desenvolvimento e conclusão com proposta de intervenção..."
                rows={18}
                className="w-full px-5 py-4 text-sm outline-none resize-none leading-relaxed"
                style={{background:'transparent', color:'#FAFAFA'}}
              />
            </div>

            <button
              onClick={corrigir}
              disabled={!tema || palavras < 50 || loading}
              className="w-full py-4 rounded-xl font-bold text-sm transition-all"
              style={{
                background: !tema || palavras < 50 || loading ? '#18181B' : '#6366F1',
                color: !tema || palavras < 50 || loading ? '#52525B' : '#fff',
                cursor: !tema || palavras < 50 || loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Corrigindo sua redação...' : 'Corrigir redação →'}
            </button>
          </>
        )}

        {/* CORREÇÃO */}
        {fase === 'correcao' && correcao && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Resultado</h1>
                <p className="text-zinc-400 text-sm mt-1">{tema}</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-extrabold tracking-tight" style={{color: notaCor(correcao.nota_total)}}>
                  {correcao.nota_total}
                </div>
                <div className="text-xs text-zinc-500">/ 1000</div>
              </div>
            </div>

            {/* COMPETÊNCIAS */}
            <div className="rounded-xl border border-zinc-800 p-5 mb-4" style={{background:'#111113'}}>
              <h3 className="text-sm font-semibold text-zinc-300 mb-4">Competências</h3>
              <div className="flex flex-col gap-4">
                {correcao.competencias.map(c => (
                  <div key={c.numero}>
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <span className="text-xs text-zinc-500 uppercase tracking-widest">Competência {c.numero}</span>
                        <div className="text-sm font-medium text-zinc-200">{c.nome}</div>
                      </div>
                      <div className="text-lg font-bold ml-4" style={{color: notaCor(c.nota * 5)}}>
                        {c.nota}<span className="text-xs text-zinc-500">/200</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-zinc-800 mb-2 overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{width:`${(c.nota/200)*100}%`, background: notaCor(c.nota * 5)}}/>
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed">{c.feedback}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* PONTOS FORTES */}
            {correcao.pontos_fortes.length > 0 && (
              <div className="rounded-xl p-5 mb-4" style={{background:'rgba(34,211,160,0.05)', border:'1px solid rgba(34,211,160,0.2)'}}>
                <h3 className="text-sm font-semibold mb-3" style={{color:'#22d3a0'}}>Pontos fortes</h3>
                <ul className="flex flex-col gap-1">
                  {correcao.pontos_fortes.map((p, i) => (
                    <li key={i} className="text-sm text-zinc-300 flex gap-2">
                      <span style={{color:'#22d3a0'}}>✓</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* PONTOS DE MELHORA */}
            {correcao.pontos_melhora.length > 0 && (
              <div className="rounded-xl p-5 mb-4" style={{background:'rgba(248,113,113,0.05)', border:'1px solid rgba(248,113,113,0.2)'}}>
                <h3 className="text-sm font-semibold mb-3" style={{color:'#f87171'}}>O que melhorar</h3>
                <ul className="flex flex-col gap-1">
                  {correcao.pontos_melhora.map((p, i) => (
                    <li key={i} className="text-sm text-zinc-300 flex gap-2">
                      <span style={{color:'#f87171'}}>→</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* COMENTÁRIO GERAL */}
            <div className="rounded-xl border border-zinc-800 p-5 mb-6" style={{background:'#111113'}}>
              <h3 className="text-sm font-semibold text-zinc-300 mb-2">Comentário geral</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{correcao.comentario_geral}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setFase('escrever'); setCorrecao(null); setTexto(''); setTema('') }}
                className="flex-1 py-3 rounded-xl font-bold text-sm transition-all"
                style={{background:'#6366F1', color:'#fff'}}
              >
                Nova redação →
              </button>
              <Link href="/dashboard" className="flex-1">
                <button className="w-full py-3 rounded-xl text-sm font-semibold border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-all">
                  Ver painel
                </button>
              </Link>
            </div>
          </>
        )}

        {/* HISTÓRICO */}
        {fase === 'historico' && (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight">Histórico de redações</h1>
              <p className="text-zinc-400 text-sm mt-1">Acompanhe sua evolução ao longo do tempo.</p>
            </div>

            {historico.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-zinc-600 text-sm mb-4">Você ainda não fez nenhuma redação.</div>
                <button onClick={() => setFase('escrever')}
                  className="px-6 py-3 rounded-xl font-bold text-sm"
                  style={{background:'#6366F1', color:'#fff'}}>
                  Fazer primeira redação
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {historico.map(r => (
                  <div key={r.id} className="rounded-xl border border-zinc-800 p-4 flex items-center justify-between"
                    style={{background:'#111113'}}>
                    <div>
                      <div className="text-sm font-medium text-zinc-200 mb-1">{r.tema}</div>
                      <div className="text-xs text-zinc-600">{new Date(r.created_at).toLocaleDateString('pt-BR')}</div>
                    </div>
                    <div className="text-2xl font-extrabold ml-4" style={{color: notaCor(r.nota_total)}}>
                      {r.nota_total}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
