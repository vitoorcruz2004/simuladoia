import { supabase } from './supabase'

export const BADGES = [
  { id: 'primeiro_simulado', nome: 'Primeiro Passo', emoji: '🎯', descricao: 'Completou o primeiro simulado', condicao: (g: any) => g.total_simulados >= 1 },
  { id: 'streak_3', nome: '3 Dias Seguidos', emoji: '🔥', descricao: 'Estudou 3 dias seguidos', condicao: (g: any) => g.streak_maximo >= 3 },
  { id: 'streak_7', nome: 'Semana Completa', emoji: '⚡', descricao: 'Estudou 7 dias seguidos', condicao: (g: any) => g.streak_maximo >= 7 },
  { id: 'streak_30', nome: 'Mês de Dedicação', emoji: '🏆', descricao: 'Estudou 30 dias seguidos', condicao: (g: any) => g.streak_maximo >= 30 },
  { id: '100_pontos', nome: 'Centenário', emoji: '💯', descricao: 'Acumulou 100 pontos', condicao: (g: any) => g.pontos >= 100 },
  { id: '500_pontos', nome: 'Dedicado', emoji: '🌟', descricao: 'Acumulou 500 pontos', condicao: (g: any) => g.pontos >= 500 },
  { id: 'primeira_redacao', nome: 'Escritor', emoji: '✍️', descricao: 'Fez a primeira redação', condicao: (g: any) => g.total_redacoes >= 1 },
  { id: '10_simulados', nome: 'Veterano', emoji: '🎖️', descricao: 'Completou 10 simulados', condicao: (g: any) => g.total_simulados >= 10 },
  { id: 'meta_7', nome: 'Meta Semanal', emoji: '📅', descricao: 'Atingiu a meta diária 7 dias', condicao: (g: any) => g.streak_maximo >= 7 },
]

function getSemana() {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const week = Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7)
  return `${now.getFullYear()}-W${week}`
}

export async function atualizarGamificacao(userId: string, tipo: 'simulado' | 'redacao', pontosExtras = 0, questoesRespondidas = 0) {
  const hoje = new Date().toISOString().split('T')[0]
  const semana = getSemana()

  const { data: existing } = await supabase
    .from('gamificacao')
    .select('*')
    .eq('user_id', userId)
    .single()

  let streak = 1
  let streakMax = 1
  let pontos = 10 + pontosExtras
  let questoesHoje = questoesRespondidas
  let streakFreeze = 0

  if (existing) {
    const ontem = new Date()
    ontem.setDate(ontem.getDate() - 1)
    const ontemStr = ontem.toISOString().split('T')[0]
    streakFreeze = existing.streak_freeze || 0

    if (existing.ultimo_estudo === hoje) {
      streak = existing.streak_atual
      pontos = existing.pontos + pontosExtras
      questoesHoje = (existing.questoes_hoje || 0) + questoesRespondidas
    } else if (existing.ultimo_estudo === ontemStr) {
      streak = existing.streak_atual + 1
      const bonus = streak >= 30 ? 50 : streak >= 7 ? 20 : streak >= 3 ? 5 : 0
      pontos = existing.pontos + 10 + pontosExtras + bonus
      questoesHoje = questoesRespondidas
    } else if (streakFreeze > 0) {
      // usa streak freeze
      streak = existing.streak_atual
      pontos = existing.pontos + 10 + pontosExtras
      streakFreeze = streakFreeze - 1
      questoesHoje = questoesRespondidas
    } else {
      streak = 1
      pontos = existing.pontos + 10 + pontosExtras
      questoesHoje = questoesRespondidas
    }

    streakMax = Math.max(streak, existing.streak_maximo || 1)

    const novaGam = {
      pontos,
      streak_atual: streak,
      streak_maximo: streakMax,
      ultimo_estudo: hoje,
      total_simulados: tipo === 'simulado' ? (existing.total_simulados || 0) + 1 : (existing.total_simulados || 0),
      total_redacoes: tipo === 'redacao' ? (existing.total_redacoes || 0) + 1 : (existing.total_redacoes || 0),
      questoes_hoje: questoesHoje,
      streak_freeze: streakFreeze,
      updated_at: new Date().toISOString(),
    }

    const badgesAtivos: string[] = Array.isArray(existing.badges) ? existing.badges : []
    const novosBadges = BADGES.filter(b => !badgesAtivos.includes(b.id) && b.condicao({ ...novaGam })).map(b => b.id)

    await supabase.from('gamificacao').update({
      ...novaGam,
      badges: [...badgesAtivos, ...novosBadges],
    }).eq('user_id', userId)

    // atualiza leaderboard
    await atualizarLeaderboard(userId, 10 + pontosExtras, semana)

    return { streak, pontos, novosBadges, questoesHoje, metaDiaria: existing.meta_diaria || 10 }
  } else {
    await supabase.from('gamificacao').insert({
      user_id: userId,
      pontos: 10 + pontosExtras,
      streak_atual: 1,
      streak_maximo: 1,
      ultimo_estudo: hoje,
      total_simulados: tipo === 'simulado' ? 1 : 0,
      total_redacoes: tipo === 'redacao' ? 1 : 0,
      questoes_hoje: questoesRespondidas,
      streak_freeze: 0,
      meta_diaria: 10,
      badges: ['primeiro_simulado'],
    })

    await atualizarLeaderboard(userId, 10 + pontosExtras, semana)
    return { streak: 1, pontos: 10 + pontosExtras, novosBadges: ['primeiro_simulado'], questoesHoje: questoesRespondidas, metaDiaria: 10 }
  }
}

async function atualizarLeaderboard(userId: string, pontosNovos: number, semana: string) {
  const { data: profile } = await supabase.from('profiles').select('nome').eq('id', userId).single()
  const nome = profile?.nome || 'Anônimo'

  const { data: existing } = await supabase
    .from('leaderboard')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (existing && existing.semana === semana) {
    await supabase.from('leaderboard').update({
      pontos_semana: existing.pontos_semana + pontosNovos,
      updated_at: new Date().toISOString(),
    }).eq('user_id', userId)
  } else {
    await supabase.from('leaderboard').upsert({
      user_id: userId,
      nome,
      pontos_semana: pontosNovos,
      semana,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
  }
}

export async function comprarStreakFreeze(userId: string): Promise<boolean> {
  const { data } = await supabase.from('gamificacao').select('pontos, streak_freeze').eq('user_id', userId).single()
  if (!data || data.pontos < 50) return false

  await supabase.from('gamificacao').update({
    pontos: data.pontos - 50,
    streak_freeze: (data.streak_freeze || 0) + 1,
  }).eq('user_id', userId)

  return true
}

export async function registrarQuestaoErrada(userId: string, questaoId: string) {
  const { data: existing } = await supabase
    .from('questoes_erradas')
    .select('*')
    .eq('user_id', userId)
    .eq('questao_id', questaoId)
    .single()

  if (existing) {
    await supabase.from('questoes_erradas').update({
      vezes_errada: existing.vezes_errada + 1,
      ultima_vez: new Date().toISOString(),
    }).eq('id', existing.id)
  } else {
    await supabase.from('questoes_erradas').insert({ user_id: userId, questao_id: questaoId })
  }
}
