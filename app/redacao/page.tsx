'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { atualizarGamificacao } from '@/lib/gamificacao'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Competencia {
  numero: number; nome: string; nota: number; nivel: string
  feedback: string; exemplos_erros?: string[]; repertorio_usado?: string
  conectivos_usados?: string; elementos?: Record<string, string>
}
interface Correcao {
  nota_total: number; competencias: Competencia[]
  pontos_fortes: string[]; pontos_melhora: string[]
  comentario_geral: string; nota_estimada_real: string
}
interface HistoricoRedacao { id: string; tema: string; nota_total: number; created_at: string }

const TEMAS_SUGERIDOS = [
  { tema: 'Desafios para a valorização da herança africana no Brasil', ano: '2024' },
  { tema: 'Invisibilidade e registro civil: garantia de acesso à cidadania no Brasil', ano: '2021' },
  { tema: 'O estigma associado às doenças mentais na sociedade brasileira', ano: '2020' },
  { tema: 'Democratização do acesso ao cinema no Brasil', ano: '2019' },
  { tema: 'Manipulação do comportamento do usuário pelo controle de dados na internet', ano: '2018' },
  { tema: 'A persistência da violência contra a mulher na sociedade brasileira', ano: '2015' },
]

const DICAS_RAPIDAS = [
  { emoji: '📌', titulo: 'Tese na intro', desc: 'Apresente sua posição claramente no 1º parágrafo' },
  { emoji: '🔗', titulo: 'Conectivos', desc: 'Use: "Ademais", "Nesse sentido", "Com efeito", "Portanto"' },
  { emoji: '📚', titulo: 'Repertório', desc: 'Cite autores, obras, dados ou fatos históricos relevantes' },
  { emoji: '🎯', titulo: 'Proposta completa', desc: 'Agente + Ação + Meio + Efeito + Detalhamento' },
]

export default function Redacao() {
  const [user, setUser] = useState<any>(null)
  const [tema, setTema] = useState('')
  const [texto, setTexto] = useState('')
  const [correcao, setCorrecao] = useState<Correcao | null>(null)
  const [historico, setHistorico] = useState<HistoricoRedacao[]>([])
  const [loading, setLoading] = useState(false)
  const [fase, setFase] = useState<'escrever' | 'correcao' | 'historico'>('escrever')
  const [mostrarDicas, setMostrarDicas] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      setUser(user)
      const { data } = await supabase.from('redacoes').select('id, tema, nota_total, created_at')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(10)
      setHistorico(data || [])
    }
    load()
  }, [])

  const palavras = texto.trim() === '' ? 0 : texto.trim().split(/\s+/).length
  const linhas = texto.split('\n').filter(l => l.trim()).length

  async function corrigir() {
    if (!tema || palavras < 50) return
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
        if (user) {
          await supabase.from('redacoes').insert({
            user_id: user.id, tema, texto,
            nota_total: data.correcao.nota_total,
            correcao: data.correcao,
          })
          const bonus = Math.round((data.correcao.nota_total / 1000) * 30)
          await atualizarGamificacao(user.id, 'redacao', bonus, 0)
          setHistorico(prev => [{ id: Date.now().toString(), tema, nota_total: data.correcao.nota_total, created_at: new Date().toISOString() }, ...prev])
        }
        setFase('correcao')
      }
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const notaCor = (nota: number, max = 1000) => {
    const pct = nota / max
    if (pct >= 0.8) return '#22d3a0'
    if (pct >= 0.6) return '#f59e0b'
    return '#f87171'
  }

  const nivelIcon = (nivel: string) => {
    const map: Record<string, string> = { 'Excelente': '🟢', 'Bom': '🔵', 'Mediano': '🟡', 'Precário': '🟠', 'Insuficiente': '🔴' }
    return map[nivel] || '⚪'
  }

  return (
    <div className="min-h-screen" style={{background:'#09090B'}}>
      <nav className="border-b border-zinc-800 px-8 h-14 flex items-center justify-between">
        <Link href="/dashboard">
          <div className="text-lg font-extrabold tracking-tight cursor-pointer">Simulado<span style={{color:'#818CF8'}}>IA</span></div>
        </Link>
        <div className="flex gap-1 p-1 rounded-lg" style={{background:'#111113', border:'1px solid #27272A'}}>
          {[{key:'escrever',label:'Escrever'},{key:'historico',label:`Histórico (${historico.length})`}].map(tab => (
            <button key={tab.key} onClick={() => { setFase(tab.key as any); if (tab.key==='escrever') setCorrecao(null) }}
              className="px-4 py-1.5 rounded-md text-sm font-medium transition-all"
              style={{background: fase===tab.key||(fase==='correcao'&&tab.key==='escrever')?'#27272A':'transparent',
                color: fase===tab.key||(fase==='correcao'&&tab.key==='escrever')?'#FAFAFA':'#71717A'}}>
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-8">

        {/* ESCREVER */}
        {fase === 'escrever' && (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight">Redação ENEM</h1>
              <p className="text-zinc-400 text-sm mt-1">Corrija com IA treinada nas 5 competências do INEP e exemplos de redações nota 1000.</p>
            </div>

            {/* DICAS RÁPIDAS */}
            <button onClick={() => setMostrarDicas(!mostrarDicas)}
              className="flex items-center gap-2 text-xs font-semibold mb-3 transition-colors"
              style={{color:'#818CF8'}}>
              💡 Dicas rápidas {mostrarDicas ? '▲' : '▼'}
            </button>
            {mostrarDicas && (
              <div className="grid grid-cols-2 gap-2 mb-5">
                {DICAS_RAPIDAS.map((d, i) => (
                  <div key={i} className="rounded-lg border border-zinc-800 p-3 flex gap-2" style={{background:'#111113'}}>
                    <span className="text-lg">{d.emoji}</span>
                    <div>
                      <div className="text-xs font-semibold text-zinc-200">{d.titulo}</div>
                      <div className="text-xs text-zinc-500 mt-0.5">{d.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TEMA */}
            <div className="rounded-xl border border-zinc-800 p-5 mb-4" style={{background:'#111113'}}>
              <label className="text-sm font-semibold text-zinc-300 mb-3 block">Tema da redação</label>
              <input type="text" value={tema} onChange={e => setTema(e.target.value)}
                placeholder="Digite o tema ou escolha um dos últimos ENEMs abaixo"
                className="w-full px-4 py-3 rounded-lg text-sm outline-none mb-3"
                style={{background:'#18181B', border:'1px solid #27272A', color:'#FAFAFA'}}/>
              <div className="flex flex-col gap-2">
                {TEMAS_SUGERIDOS.map((t, i) => (
                  <button key={i} onClick={() => setTema(t.tema)}
                    className="text-left text-xs px-3 py-2 rounded-lg transition-all flex items-center gap-2"
                    style={{
                      background: tema === t.tema ? 'rgba(99,102,241,0.12)' : '#18181B',
                      border: tema === t.tema ? '1px solid rgba(99,102,241,0.4)' : '1px solid #27272A',
                      color: tema === t.tema ? '#818CF8' : '#71717A'
                    }}>
                    <span className="text-zinc-600 font-mono">{t.ano}</span>
                    <span>{t.tema}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* TEXTO */}
            <div className="rounded-xl border border-zinc-800 overflow-hidden mb-4" style={{background:'#111113'}}>
              <div className="px-4 py-2 border-b border-zinc-800 flex justify-between items-center">
                <span className="text-xs text-zinc-500">Sua redação (mín. 7 linhas, máx. 30 linhas)</span>
                <div className="flex gap-3 text-xs">
                  <span style={{color: palavras >= 150 && palavras <= 500 ? '#22d3a0' : '#f59e0b'}}>
                    {palavras} palavras
                  </span>
                  <span style={{color: linhas >= 7 && linhas <= 30 ? '#22d3a0' : linhas > 0 ? '#f59e0b' : '#52525B'}}>
                    ~{linhas} linhas
                  </span>
                </div>
              </div>
              <textarea value={texto} onChange={e => setTexto(e.target.value)}
                placeholder="Escreva sua redação dissertativo-argumentativa aqui.

Estrutura recomendada:
• Introdução (1 parágrafo): apresente o tema e sua tese
• Desenvolvimento (2 parágrafos): argumente com repertório sociocultural
• Conclusão (1 parágrafo): proposta de intervenção com agente, ação, meio, efeito e detalhamento"
                rows={20}
                className="w-full px-5 py-4 text-sm outline-none resize-none leading-relaxed"
                style={{background:'transparent', color:'#FAFAFA'}}/>
            </div>

            <button onClick={corrigir} disabled={!tema || palavras < 50 || loading}
              className="w-full py-4 rounded-xl font-bold text-sm transition-all"
              style={{
                background: !tema || palavras < 50 || loading ? '#18181B' : '#6366F1',
                color: !tema || palavras < 50 || loading ? '#52525B' : '#fff',
                cursor: !tema || palavras < 50 || loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}>
              {loading ? '🔍 Corrigindo com IA especialista...' : 'Corrigir redação →'}
            </button>
            {loading && <p className="text-center text-xs text-zinc-600 mt-2">Comparando com redações nota 1000 do ENEM 2024...</p>}
          </>
        )}

        {/* CORREÇÃO */}
        {fase === 'correcao' && correcao && (
          <>
            {/* NOTA HERO */}
            <div className="rounded-2xl p-6 mb-6 text-center relative overflow-hidden"
              style={{background: `linear-gradient(135deg, rgba(99,102,241,0.1), rgba(99,102,241,0.03))`, border:'1px solid rgba(99,102,241,0.2)'}}>
              <div className="text-6xl font-extrabold tracking-tight mb-1"
                style={{color: notaCor(correcao.nota_total)}}>
                {correcao.nota_total}
              </div>
              <div className="text-zinc-400 text-sm mb-2">de 1000 pontos</div>
              {correcao.nota_estimada_real && (
                <div className="text-xs text-zinc-500 italic">{correcao.nota_estimada_real}</div>
              )}
              <div className="text-xs text-zinc-500 mt-2 max-w-xs mx-auto">{correcao.comentario_geral}</div>
            </div>

            {/* BARRA DE COMPETÊNCIAS */}
            <div className="rounded-xl border border-zinc-800 p-5 mb-4" style={{background:'#111113'}}>
              <h3 className="text-sm font-semibold text-zinc-300 mb-4">Competências</h3>
              <div className="flex flex-col gap-5">
                {correcao.competencias.map(c => (
                  <div key={c.numero}>
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <span className="text-xs mr-1">{nivelIcon(c.nivel)}</span>
                        <span className="text-xs text-zinc-500 uppercase tracking-widest">C{c.numero}</span>
                        <div className="text-sm font-medium text-zinc-200">{c.nome}</div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-lg font-bold" style={{color: notaCor(c.nota, 200)}}>
                          {c.nota}<span className="text-xs text-zinc-500">/200</span>
                        </div>
                        <div className="text-xs text-zinc-600">{c.nivel}</div>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-800 mb-2 overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{width:`${(c.nota/200)*100}%`, background: notaCor(c.nota, 200)}}/>
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed mb-1">{c.feedback}</p>

                    {/* Erros específicos C1 */}
                    {c.exemplos_erros && c.exemplos_erros.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {c.exemplos_erros.map((e, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 rounded-full"
                            style={{background:'rgba(248,113,113,0.1)', color:'#f87171', border:'1px solid rgba(248,113,113,0.2)'}}>
                            {e}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Repertório C2 */}
                    {c.repertorio_usado && (
                      <div className="text-xs mt-1" style={{color:'#818CF8'}}>
                        📚 Repertório: {c.repertorio_usado}
                      </div>
                    )}

                    {/* Conectivos C4 */}
                    {c.conectivos_usados && (
                      <div className="text-xs mt-1 text-zinc-600">
                        🔗 Conectivos: {c.conectivos_usados}
                      </div>
                    )}

                    {/* Elementos proposta C5 */}
                    {c.elementos && (
                      <div className="mt-2 grid grid-cols-2 gap-1">
                        {Object.entries(c.elementos).map(([k, v]) => (
                          <div key={k} className="flex items-start gap-1 text-xs">
                            <span style={{color: v === 'Ausente' ? '#f87171' : '#22d3a0'}}>
                              {v === 'Ausente' ? '✗' : '✓'}
                            </span>
                            <span className="text-zinc-500 capitalize">{k}:</span>
                            <span className="text-zinc-400" style={{color: v === 'Ausente' ? '#f87171' : undefined}}>
                              {v.length > 40 ? v.substring(0, 40) + '...' : v}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* PONTOS FORTES */}
            {correcao.pontos_fortes.length > 0 && (
              <div className="rounded-xl p-4 mb-3" style={{background:'rgba(34,211,160,0.05)', border:'1px solid rgba(34,211,160,0.15)'}}>
                <h3 className="text-xs font-bold mb-2 uppercase tracking-widest" style={{color:'#22d3a0'}}>Pontos fortes</h3>
                {correcao.pontos_fortes.map((p, i) => (
                  <div key={i} className="text-sm text-zinc-300 flex gap-2 mb-1">
                    <span style={{color:'#22d3a0'}}>✓</span> {p}
                  </div>
                ))}
              </div>
            )}

            {/* MELHORAR */}
            {correcao.pontos_melhora.length > 0 && (
              <div className="rounded-xl p-4 mb-5" style={{background:'rgba(248,113,113,0.05)', border:'1px solid rgba(248,113,113,0.15)'}}>
                <h3 className="text-xs font-bold mb-2 uppercase tracking-widest" style={{color:'#f87171'}}>O que melhorar</h3>
                {correcao.pontos_melhora.map((p, i) => (
                  <div key={i} className="text-sm text-zinc-300 flex gap-2 mb-1">
                    <span style={{color:'#f87171'}}>→</span> {p}
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => { setFase('escrever'); setCorrecao(null); setTexto(''); setTema('') }}
                className="flex-1 py-3 rounded-xl font-bold text-sm" style={{background:'#6366F1', color:'#fff'}}>
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
              <h1 className="text-2xl font-bold tracking-tight">Histórico</h1>
              <p className="text-zinc-400 text-sm mt-1">Sua evolução ao longo do tempo.</p>
            </div>
            {historico.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-4xl mb-4">✍️</div>
                <p className="text-zinc-500 text-sm mb-4">Você ainda não fez nenhuma redação.</p>
                <button onClick={() => setFase('escrever')}
                  className="px-6 py-3 rounded-xl font-bold text-sm" style={{background:'#6366F1', color:'#fff'}}>
                  Fazer primeira redação
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {historico.map(r => (
                  <div key={r.id} className="rounded-xl border border-zinc-800 p-4 flex items-center justify-between"
                    style={{background:'#111113'}}>
                    <div>
                      <div className="text-sm font-medium text-zinc-200 mb-1 max-w-xs truncate">{r.tema}</div>
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
