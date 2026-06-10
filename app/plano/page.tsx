'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Desempenho { area: string; percentual: number; total_respondidas: number }
interface SemanaPlano {
  semana: number
  foco_principal: string
  foco_secundario: string
  horas_estudo: number
  atividades: string[]
  simulado: boolean
  redacao: boolean
}

export default function Plano() {
  const [user, setUser] = useState<any>(null)
  const [desempenho, setDesempenho] = useState<Desempenho[]>([])
  const [dataProva, setDataProva] = useState('')
  const [tipoProva, setTipoProva] = useState('ENEM')
  const [horasPorDia, setHorasPorDia] = useState('2')
  const [plano, setPlano] = useState<SemanaPlano[]>([])
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

  function semanasFaltando() {
    if (!dataProva) return 0
    const hoje = new Date()
    const prova = new Date(dataProva)
    const diff = prova.getTime() - hoje.getTime()
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24 * 7)))
  }

  async function gerarPlano() {
    if (!dataProva) return
    setLoading(true)

    const semanas = semanasFaltando()
    const gaps = desempenho.filter(d => d.percentual < 60).map(d => d.area)
    const fortes = desempenho.filter(d => d.percentual >= 70).map(d => d.area)
    const horas = parseInt(horasPorDia)

    const prompt = `Você é um especialista em preparação para ${tipoProva} no Brasil.

Crie um plano de estudos detalhado para um estudante com as seguintes características:
- Semanas até a prova: ${semanas}
- Horas de estudo por dia: ${horas}h
- Áreas com maior dificuldade (gaps): ${gaps.length > 0 ? gaps.join(', ') : 'Ainda sem dados — distribua igualmente'}
- Áreas com bom desempenho: ${fortes.length > 0 ? fortes.join(', ') : 'Ainda sem dados'}

Retorne APENAS um JSON válido com este formato exato, sem markdown, sem texto adicional:
{
  "semanas": [
    {
      "semana": 1,
      "foco_principal": "nome da área principal",
      "foco_secundario": "nome da área secundária",
      "horas_estudo": numero_total_de_horas_na_semana,
      "atividades": ["atividade 1", "atividade 2", "atividade 3"],
      "simulado": true ou false,
      "redacao": true ou false
    }
  ]
}

Gere exatamente ${Math.min(semanas, 12)} semanas. Priorize os gaps. Inclua simulado a cada 2 semanas. Inclua redação a cada semana se ${tipoProva} for ENEM. Atividades devem ser específicas e acionáveis.`

    try {
      const res = await fetch('/api/plano', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      })
      const data = await res.json()
      if (data.plano) {
        setPlano(data.plano)
        setGerado(true)
      }
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const semanas = semanasFaltando()

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
          <Link href="/redacao" className="hover:text-zinc-300 transition-colors">Redação</Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Plano de estudos</h1>
          <p className="text-zinc-400 text-sm mt-1">IA monta seu cronograma personalizado baseado nos seus gaps.</p>
        </div>

        {/* FORM */}
        {!gerado && (
          <div className="rounded-xl border border-zinc-800 p-6 mb-8" style={{background:'#111113'}}>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-sm text-zinc-400 mb-2 block">Tipo de prova</label>
                <select
                  value={tipoProva}
                  onChange={e => setTipoProva(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg text-sm outline-none"
                  style={{background:'#18181B', border:'1px solid #27272A', color:'#FAFAFA'}}
                >
                  <option>ENEM</option>
                  <option>Concurso Público</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-2 block">Data da prova</label>
                <input
                  type="date"
                  value={dataProva}
                  onChange={e => setDataProva(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg text-sm outline-none"
                  style={{background:'#18181B', border:'1px solid #27272A', color:'#FAFAFA'}}
                />
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-2 block">Horas de estudo por dia</label>
                <select
                  value={horasPorDia}
                  onChange={e => setHorasPorDia(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg text-sm outline-none"
                  style={{background:'#18181B', border:'1px solid #27272A', color:'#FAFAFA'}}
                >
                  <option value="1">1 hora</option>
                  <option value="2">2 horas</option>
                  <option value="3">3 horas</option>
                  <option value="4">4 horas</option>
                  <option value="5">5+ horas</option>
                </select>
              </div>

              {dataProva && (
                <div className="rounded-lg p-4" style={{background:'#18181B', border:'1px solid #27272A'}}>
                  <div className="text-sm text-zinc-400">
                    <span className="text-white font-bold text-lg">{semanas}</span> semanas até a prova
                    {desempenho.length === 0 && (
                      <p className="text-zinc-500 text-xs mt-1">Faça um simulado antes para personalizar ainda mais o plano.</p>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={gerarPlano}
                disabled={!dataProva || loading}
                className="w-full py-4 rounded-xl font-bold text-sm transition-all"
                style={{
                  background: !dataProva || loading ? '#18181B' : '#6366F1',
                  color: !dataProva || loading ? '#52525B' : '#fff',
                  cursor: !dataProva || loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Gerando seu plano...' : 'Gerar plano personalizado →'}
              </button>
            </div>
          </div>
        )}

        {/* PLANO GERADO */}
        {gerado && plano.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold">Seu plano — {semanas} semanas</h2>
                <p className="text-zinc-500 text-sm">{horasPorDia}h por dia · {tipoProva}</p>
              </div>
              <button
                onClick={() => { setGerado(false); setPlano([]) }}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Refazer
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {plano.map((s, i) => (
                <div key={i} className="rounded-xl border border-zinc-800 p-5" style={{background:'#111113'}}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Semana {s.semana}</div>
                      <div className="font-bold text-base">{s.foco_principal}</div>
                      <div className="text-sm text-zinc-400">{s.foco_secundario}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold" style={{color:'#818CF8'}}>{s.horas_estudo}h</div>
                      <div className="text-xs text-zinc-600">esta semana</div>
                    </div>
                  </div>

                  <div className="flex gap-2 mb-3">
                    {s.simulado && (
                      <span className="text-xs px-2 py-1 rounded-full" style={{background:'rgba(99,102,241,0.1)', color:'#818CF8', border:'1px solid rgba(99,102,241,0.2)'}}>
                        📝 Simulado
                      </span>
                    )}
                    {s.redacao && (
                      <span className="text-xs px-2 py-1 rounded-full" style={{background:'rgba(34,211,160,0.1)', color:'#22d3a0', border:'1px solid rgba(34,211,160,0.2)'}}>
                        ✍️ Redação
                      </span>
                    )}
                  </div>

                  <ul className="flex flex-col gap-1">
                    {s.atividades.map((a, j) => (
                      <li key={j} className="text-sm text-zinc-400 flex items-start gap-2">
                        <span style={{color:'#6366F1'}}>·</span> {a}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <Link href="/simulado" className="flex-1">
                <button className="w-full py-3 rounded-xl font-bold text-sm transition-all"
                  style={{background:'#6366F1', color:'#fff'}}>
                  Começar simulado →
                </button>
              </Link>
              <Link href="/redacao" className="flex-1">
                <button className="w-full py-3 rounded-xl font-bold text-sm border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-all">
                  Treinar redação →
                </button>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
