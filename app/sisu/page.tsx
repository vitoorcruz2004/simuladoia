'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const CURSOS_POPULARES = [
  { curso: 'Medicina', universidade: 'USP', nota_corte: 820, concorrencia: 'Altíssima' },
  { curso: 'Medicina', universidade: 'UNICAMP', nota_corte: 815, concorrencia: 'Altíssima' },
  { curso: 'Medicina', universidade: 'UFMG', nota_corte: 800, concorrencia: 'Altíssima' },
  { curso: 'Direito', universidade: 'USP', nota_corte: 740, concorrencia: 'Alta' },
  { curso: 'Direito', universidade: 'UFMG', nota_corte: 720, concorrencia: 'Alta' },
  { curso: 'Engenharia de Computação', universidade: 'ITA', nota_corte: 780, concorrencia: 'Altíssima' },
  { curso: 'Ciência da Computação', universidade: 'USP', nota_corte: 720, concorrencia: 'Alta' },
  { curso: 'Ciência da Computação', universidade: 'UNICAMP', nota_corte: 715, concorrencia: 'Alta' },
  { curso: 'Engenharia Civil', universidade: 'USP', nota_corte: 700, concorrencia: 'Alta' },
  { curso: 'Psicologia', universidade: 'USP', nota_corte: 700, concorrencia: 'Alta' },
  { curso: 'Administração', universidade: 'FGV', nota_corte: 720, concorrencia: 'Alta' },
  { curso: 'Enfermagem', universidade: 'UNIFESP', nota_corte: 620, concorrencia: 'Média' },
  { curso: 'Pedagogia', universidade: 'UFMG', nota_corte: 580, concorrencia: 'Média' },
  { curso: 'História', universidade: 'UFMG', nota_corte: 590, concorrencia: 'Média' },
  { curso: 'Letras', universidade: 'USP', nota_corte: 600, concorrencia: 'Média' },
  { curso: 'Matemática', universidade: 'UFMG', nota_corte: 570, concorrencia: 'Média' },
  { curso: 'Física', universidade: 'USP', nota_corte: 610, concorrencia: 'Média' },
  { curso: 'Química', universidade: 'UFMG', nota_corte: 560, concorrencia: 'Média' },
  { curso: 'Biologia', universidade: 'UNICAMP', nota_corte: 620, concorrencia: 'Média' },
  { curso: 'Serviço Social', universidade: 'UFMG', nota_corte: 520, concorrencia: 'Baixa' },
  { curso: 'Geografia', universidade: 'UFMG', nota_corte: 540, concorrencia: 'Baixa' },
  { curso: 'Filosofia', universidade: 'USP', nota_corte: 560, concorrencia: 'Baixa' },
  { curso: 'Artes Visuais', universidade: 'UFMG', nota_corte: 500, concorrencia: 'Baixa' },
]

const concorrenciaColor = (c: string) => {
  if (c === 'Altíssima') return '#f87171'
  if (c === 'Alta') return '#f59e0b'
  if (c === 'Média') return '#818cf8'
  return '#22d3a0'
}

export default function Sisu() {
  const [user, setUser] = useState<any>(null)
  const [notas, setNotas] = useState({ linguagens: '', humanas: '', natureza: '', matematica: '', redacao: '' })
  const [resultado, setResultado] = useState<any[]>([])
  const [calculado, setCalculado] = useState(false)
  const [desempenho, setDesempenho] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      setUser(user)
      const { data } = await supabase.from('desempenho').select('*').eq('user_id', user.id)
      setDesempenho(data || [])
    }
    load()
  }, [])

  function calcularMediaPonderada() {
    const l = parseFloat(notas.linguagens) || 0
    const h = parseFloat(notas.humanas) || 0
    const n = parseFloat(notas.natureza) || 0
    const m = parseFloat(notas.matematica) || 0
    const r = parseFloat(notas.redacao) || 0
    return (l + h + n + m + r) / 5
  }

  function calcular() {
    const media = calcularMediaPonderada()
    const aprovados = CURSOS_POPULARES.filter(c => media >= c.nota_corte - 50)
      .map(c => ({ ...c, chance: media >= c.nota_corte ? 'Alta' : media >= c.nota_corte - 30 ? 'Média' : 'Baixa', diferenca: Math.round(media - c.nota_corte) }))
      .sort((a, b) => b.nota_corte - a.nota_corte)
    setResultado(aprovados)
    setCalculado(true)
  }

  const notaEstimada = (area: string) => {
    const d = desempenho.find(d => d.area === area)
    if (!d) return ''
    return Math.round((d.percentual / 100) * 1000).toString()
  }

  function preencherAutomatico() {
    setNotas({
      linguagens: notaEstimada('Linguagens') || '',
      humanas: notaEstimada('Ciências Humanas') || '',
      natureza: notaEstimada('Ciências da Natureza') || '',
      matematica: notaEstimada('Matemática') || '',
      redacao: '',
    })
  }

  const media = calcularMediaPonderada()

  return (
    <div className="min-h-screen" style={{background:'#09090B'}}>
      <nav className="border-b border-zinc-800 px-8 h-14 flex items-center justify-between">
        <Link href="/dashboard">
          <div className="text-lg font-extrabold tracking-tight cursor-pointer">Simulado<span style={{color:'#818CF8'}}>IA</span></div>
        </Link>
        <div className="flex gap-4 text-sm text-zinc-500">
          <Link href="/dashboard" className="hover:text-zinc-300 transition-colors">Dashboard</Link>
          <Link href="/simulado" className="hover:text-zinc-300 transition-colors">Simulado</Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Simulador SiSU</h1>
          <p className="text-zinc-400 text-sm mt-1">Insira suas notas e veja em quais cursos você passaria.</p>
        </div>

        <div className="rounded-xl border border-zinc-800 p-6 mb-6" style={{background:'#111113'}}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-zinc-300">Suas notas por área</h3>
            {desempenho.length > 0 && (
              <button onClick={preencherAutomatico}
                className="text-xs px-3 py-1.5 rounded-full transition-all"
                style={{background:'rgba(99,102,241,0.1)', color:'#818CF8', border:'1px solid rgba(99,102,241,0.2)'}}>
                Preencher com meu desempenho
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'linguagens', label: 'Linguagens e Códigos' },
              { key: 'humanas', label: 'Ciências Humanas' },
              { key: 'natureza', label: 'Ciências da Natureza' },
              { key: 'matematica', label: 'Matemática' },
              { key: 'redacao', label: 'Redação' },
            ].map(campo => (
              <div key={campo.key} className={campo.key === 'redacao' ? 'col-span-2' : ''}>
                <label className="text-xs text-zinc-500 mb-1 block">{campo.label}</label>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  value={(notas as any)[campo.key]}
                  onChange={e => setNotas(prev => ({ ...prev, [campo.key]: e.target.value }))}
                  placeholder="0 – 1000"
                  className="w-full px-4 py-3 rounded-lg text-sm outline-none"
                  style={{background:'#18181B', border:'1px solid #27272A', color:'#FAFAFA'}}
                />
              </div>
            ))}
          </div>

          {media > 0 && (
            <div className="mt-4 p-3 rounded-lg flex justify-between items-center" style={{background:'#18181B'}}>
              <span className="text-sm text-zinc-400">Média geral</span>
              <span className="text-xl font-extrabold" style={{color:'#818CF8'}}>{Math.round(media)}</span>
            </div>
          )}

          <button
            onClick={calcular}
            disabled={!media}
            className="w-full mt-4 py-4 rounded-xl font-bold text-sm transition-all"
            style={{ background: media ? '#6366F1' : '#18181B', color: media ? '#fff' : '#52525B', cursor: media ? 'pointer' : 'not-allowed' }}>
            Ver onde passaria →
          </button>
        </div>

        {calculado && (
          <>
            <div className="mb-4">
              <h2 className="text-lg font-bold">Resultado — média {Math.round(media)}</h2>
              <p className="text-zinc-500 text-sm">{resultado.filter(r => r.diferenca >= 0).length} cursos onde você passaria hoje</p>
            </div>

            <div className="flex flex-col gap-3">
              {resultado.map((r, i) => (
                <div key={i} className="rounded-xl border border-zinc-800 p-4 flex items-center justify-between"
                  style={{background:'#111113', borderColor: r.diferenca >= 0 ? 'rgba(34,211,160,0.2)' : '#27272A'}}>
                  <div>
                    <div className="font-semibold text-sm">{r.curso}</div>
                    <div className="text-xs text-zinc-500">{r.universidade} · Corte: {r.nota_corte}</div>
                    <div className="text-xs mt-1" style={{color: concorrenciaColor(r.concorrencia)}}>
                      Concorrência {r.concorrencia}
                    </div>
                  </div>
                  <div className="text-right">
                    {r.diferenca >= 0 ? (
                      <div>
                        <div className="text-sm font-bold" style={{color:'#22d3a0'}}>✓ Passaria</div>
                        <div className="text-xs text-zinc-500">+{r.diferenca} pts acima</div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-sm font-bold" style={{color:'#f87171'}}>Faltam</div>
                        <div className="text-xs" style={{color:'#f87171'}}>{Math.abs(r.diferenca)} pts</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-xl border border-zinc-800 p-5" style={{background:'#111113'}}>
              <p className="text-sm text-zinc-400 leading-relaxed">
                ⚠️ Notas de corte baseadas em médias históricas do SiSU. As notas reais variam a cada edição conforme o número de candidatos. Use como referência, não como garantia.
              </p>
            </div>

            <Link href="/simulado">
              <button className="w-full mt-6 py-4 rounded-xl font-bold text-sm transition-all hover:opacity-90"
                style={{background:'#6366F1', color:'#fff'}}>
                Treinar pra chegar lá →
              </button>
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
