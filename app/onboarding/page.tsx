'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const AREAS = ['Matemática', 'Linguagens', 'Ciências Humanas', 'Ciências da Natureza']

const FEATURES = [
  {
    emoji: '🧠',
    titulo: 'Diagnóstico inteligente',
    descricao: 'A cada simulado, a IA mapeia exatamente onde você perde pontos — não só "fraco em matemática", mas qual tipo específico de questão você trava.',
  },
  {
    emoji: '🎯',
    titulo: 'Treino cirúrgico',
    descricao: 'Cada simulado é gerado pra você. Mais questões do que você precisa melhorar, menos do que já domina. Zero tempo desperdiçado.',
  },
  {
    emoji: '✍️',
    titulo: 'Redação com feedback real',
    descricao: 'Escreve, recebe nota estimada e comentário nas 5 competências do ENEM. Entende o erro, reescreve, evolui.',
  },
  {
    emoji: '📅',
    titulo: 'Plano personalizado',
    descricao: 'Informe a data da sua prova e a IA monta um cronograma semanal priorizando seus gaps até o dia da prova.',
  },
  {
    emoji: '🔥',
    titulo: 'Streak e gamificação',
    descricao: 'Mantenha sua sequência de estudos diários, acumule pontos e desbloqueie badges. Motivação pra não parar.',
  },
  {
    emoji: '🎓',
    titulo: 'Simulador SiSU',
    descricao: 'Insira suas notas atuais e veja em quais cursos e universidades você passaria hoje. Acompanhe sua evolução.',
  },
]

export default function Onboarding() {
  const [step, setStep] = useState(0)
  const [nome, setNome] = useState('')
  const [objetivo, setObjetivo] = useState('')
  const [areas, setAreas] = useState<string[]>([])
  const [dataProva, setDataProva] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const totalSteps = 4

  function toggleArea(area: string) {
    setAreas(prev => prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area])
  }

  async function finalizar() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

    // Salva nome no profile
    await supabase.from('profiles').update({ nome }).eq('id', user.id)

    // Pré-cria desempenho com peso nas áreas fracas selecionadas
    for (const area of AREAS) {
      const percentualInicial = areas.includes(area) ? 30 : 60
      await supabase.from('desempenho').upsert({
        user_id: user.id,
        area,
        total_respondidas: 0,
        total_acertos: 0,
        percentual: percentualInicial,
      }, { onConflict: 'user_id,area,subarea' })
    }

    router.push('/dashboard')
  }

  const progresso = ((step) / totalSteps) * 100

  return (
    <div className="min-h-screen flex flex-col" style={{background:'#09090B'}}>
      {/* PROGRESS BAR */}
      {step > 0 && (
        <div className="h-1 bg-zinc-800">
          <div className="h-full transition-all duration-500" style={{width:`${progresso}%`, background:'#6366F1'}}/>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-2xl">

          {/* STEP 0 — APRESENTAÇÃO */}
          {step === 0 && (
            <div className="text-center">
              <div className="text-3xl font-extrabold tracking-tight mb-2">
                Simulado<span style={{color:'#818CF8'}}>IA</span>
              </div>
              <p className="text-zinc-400 text-sm mb-12">A plataforma que aprende com você e treina onde dói.</p>

              <h1 className="text-2xl font-bold tracking-tight mb-2">
                Pare de estudar o que você já sabe.
              </h1>
              <p className="text-zinc-400 mb-10 max-w-lg mx-auto leading-relaxed">
                80% do tempo de estudo vai pra conteúdo que você já domina. O SimuladoIA mapeia seus pontos fracos e treina exatamente nisso.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10 text-left">
                {FEATURES.map((f, i) => (
                  <div key={i} className="rounded-xl border border-zinc-800 p-5 flex gap-4" style={{background:'#111113'}}>
                    <div className="text-2xl flex-shrink-0">{f.emoji}</div>
                    <div>
                      <div className="font-semibold text-sm mb-1">{f.titulo}</div>
                      <div className="text-xs text-zinc-500 leading-relaxed">{f.descricao}</div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setStep(1)}
                className="w-full max-w-sm py-4 rounded-xl font-bold text-base transition-all hover:opacity-90"
                style={{background:'#6366F1', color:'#fff'}}
              >
                Começar agora →
              </button>
              <p className="text-xs text-zinc-600 mt-3">Leva menos de 1 minuto pra configurar</p>
            </div>
          )}

          {/* STEP 1 — NOME */}
          {step === 1 && (
            <div className="text-center max-w-md mx-auto">
              <div className="text-4xl mb-6">👋</div>
              <h2 className="text-2xl font-bold tracking-tight mb-2">Como você se chama?</h2>
              <p className="text-zinc-400 text-sm mb-8">Vamos personalizar sua experiência.</p>

              <input
                type="text"
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Seu nome"
                autoFocus
                className="w-full px-5 py-4 rounded-xl text-lg outline-none mb-6 text-center"
                style={{background:'#111113', border:'1px solid #27272A', color:'#FAFAFA'}}
                onKeyDown={e => e.key === 'Enter' && nome.trim() && setStep(2)}
              />

              <button
                onClick={() => setStep(2)}
                disabled={!nome.trim()}
                className="w-full py-4 rounded-xl font-bold text-base transition-all"
                style={{
                  background: nome.trim() ? '#6366F1' : '#18181B',
                  color: nome.trim() ? '#fff' : '#52525B',
                  cursor: nome.trim() ? 'pointer' : 'not-allowed'
                }}
              >
                Continuar →
              </button>
            </div>
          )}

          {/* STEP 2 — OBJETIVO */}
          {step === 2 && (
            <div className="text-center max-w-md mx-auto">
              <div className="text-4xl mb-6">🎯</div>
              <h2 className="text-2xl font-bold tracking-tight mb-2">
                {nome ? `${nome}, qual é seu objetivo?` : 'Qual é seu objetivo?'}
              </h2>
              <p className="text-zinc-400 text-sm mb-8">Vamos adaptar a plataforma pra você.</p>

              <div className="flex flex-col gap-3 mb-8">
                {[
                  { valor: 'ENEM', emoji: '📚', label: 'ENEM', desc: 'Vestibular nacional e acesso ao SiSU' },
                  { valor: 'Concurso', emoji: '🏛️', label: 'Concurso Público', desc: 'Polícia, fiscal, judiciário e outros' },
                ].map(op => (
                  <button
                    key={op.valor}
                    onClick={() => { setObjetivo(op.valor); setStep(3) }}
                    className="w-full p-5 rounded-xl border text-left flex items-center gap-4 transition-all"
                    style={{
                      background: objetivo === op.valor ? 'rgba(99,102,241,0.1)' : '#111113',
                      borderColor: objetivo === op.valor ? '#6366F1' : '#27272A',
                    }}
                  >
                    <div className="text-3xl">{op.emoji}</div>
                    <div>
                      <div className="font-bold">{op.label}</div>
                      <div className="text-sm text-zinc-500">{op.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3 — ÁREAS FRACAS */}
          {step === 3 && (
            <div className="text-center max-w-md mx-auto">
              <div className="text-4xl mb-6">📊</div>
              <h2 className="text-2xl font-bold tracking-tight mb-2">Onde você sente mais dificuldade?</h2>
              <p className="text-zinc-400 text-sm mb-8">Selecione todas que se aplicam. Vamos priorizar essas áreas.</p>

              <div className="grid grid-cols-2 gap-3 mb-8">
                {[
                  { area: 'Matemática', emoji: '📐' },
                  { area: 'Linguagens', emoji: '📝' },
                  { area: 'Ciências Humanas', emoji: '🌍' },
                  { area: 'Ciências da Natureza', emoji: '🔬' },
                ].map(({ area, emoji }) => (
                  <button
                    key={area}
                    onClick={() => toggleArea(area)}
                    className="p-5 rounded-xl border transition-all"
                    style={{
                      background: areas.includes(area) ? 'rgba(99,102,241,0.12)' : '#111113',
                      borderColor: areas.includes(area) ? '#6366F1' : '#27272A',
                    }}
                  >
                    <div className="text-3xl mb-2">{emoji}</div>
                    <div className="text-sm font-semibold">{area}</div>
                    {areas.includes(area) && (
                      <div className="text-xs mt-1" style={{color:'#818CF8'}}>Selecionado ✓</div>
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setStep(4)}
                className="w-full py-4 rounded-xl font-bold text-base transition-all hover:opacity-90"
                style={{background:'#6366F1', color:'#fff'}}
              >
                {areas.length === 0 ? 'Pular →' : `Continuar com ${areas.length} área${areas.length > 1 ? 's' : ''} →`}
              </button>
            </div>
          )}

          {/* STEP 4 — DATA DA PROVA */}
          {step === 4 && (
            <div className="text-center max-w-md mx-auto">
              <div className="text-4xl mb-6">📅</div>
              <h2 className="text-2xl font-bold tracking-tight mb-2">Quando é sua prova?</h2>
              <p className="text-zinc-400 text-sm mb-8">Vamos calcular quantas semanas faltam e montar seu cronograma.</p>

              <input
                type="date"
                value={dataProva}
                onChange={e => setDataProva(e.target.value)}
                className="w-full px-5 py-4 rounded-xl text-base outline-none mb-4"
                style={{background:'#111113', border:'1px solid #27272A', color:'#FAFAFA'}}
              />

              {dataProva && (
                <div className="rounded-xl p-4 mb-6" style={{background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)'}}>
                  <span className="text-sm text-zinc-300">
                    Faltam <span className="font-bold text-white">
                      {Math.max(1, Math.ceil((new Date(dataProva).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 7)))}
                    </span> semanas para sua prova
                  </span>
                </div>
              )}

              <button
                onClick={finalizar}
                disabled={loading}
                className="w-full py-4 rounded-xl font-bold text-base transition-all hover:opacity-90 mb-3"
                style={{background:'#6366F1', color:'#fff', opacity: loading ? 0.7 : 1}}
              >
                {loading ? 'Configurando...' : 'Entrar na plataforma →'}
              </button>

              {!dataProva && (
                <button
                  onClick={finalizar}
                  disabled={loading}
                  className="w-full py-3 rounded-xl text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Pular por agora
                </button>
              )}
            </div>
          )}

          {/* BACK BUTTON */}
          {step > 0 && step < 4 && (
            <div className="text-center mt-6">
              <button onClick={() => setStep(s => s - 1)} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
                ← Voltar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
