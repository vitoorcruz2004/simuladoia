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
]

export async function atualizarGamificacao(userId: string, tipo: 'simulado' | 'redacao', pontosExtras = 0) {
  const hoje = new Date().toISOString().split('T')[0]

  const { data: existing } = await supabase
    .from('gamificacao')
    .select('*')
    .eq('user_id', userId)
    .single()

  let streak = 1
  let streakMax = 1
  let pontos = 10 + pontosExtras

  if (existing) {
    const ontem = new Date()
    ontem.setDate(ontem.getDate() - 1)
    const ontemStr = ontem.toISOString().split('T')[0]

    if (existing.ultimo_estudo === hoje) {
      streak = existing.streak_atual
      pontos = existing.pontos + pontosExtras
    } else if (existing.ultimo_estudo === ontemStr) {
      streak = existing.streak_atual + 1
      pontos = existing.pontos + 10 + pontosExtras + (streak >= 7 ? 20 : streak >= 3 ? 5 : 0)
    } else {
      streak = 1
      pontos = existing.pontos + 10 + pontosExtras
    }

    streakMax = Math.max(streak, existing.streak_maximo || 1)

    const novaGamificacao = {
      pontos,
      streak_atual: streak,
      streak_maximo: streakMax,
      ultimo_estudo: hoje,
      total_simulados: tipo === 'simulado' ? (existing.total_simulados || 0) + 1 : (existing.total_simulados || 0),
      total_redacoes: tipo === 'redacao' ? (existing.total_redacoes || 0) + 1 : (existing.total_redacoes || 0),
      updated_at: new Date().toISOString(),
    }

    // verificar badges
    const badgesAtivos: string[] = Array.isArray(existing.badges) ? existing.badges : []
    const novosBadges = BADGES.filter(b => !badgesAtivos.includes(b.id) && b.condicao({ ...novaGamificacao, badges: badgesAtivos })).map(b => b.id)

    await supabase.from('gamificacao').update({
      ...novaGamificacao,
      badges: [...badgesAtivos, ...novosBadges],
    }).eq('user_id', userId)

    return { streak, pontos, novosBadges }
  } else {
    await supabase.from('gamificacao').insert({
      user_id: userId,
      pontos: 10 + pontosExtras,
      streak_atual: 1,
      streak_maximo: 1,
      ultimo_estudo: hoje,
      total_simulados: tipo === 'simulado' ? 1 : 0,
      total_redacoes: tipo === 'redacao' ? 1 : 0,
      badges: [],
    })
    return { streak: 1, pontos: 10 + pontosExtras, novosBadges: ['primeiro_simulado'] }
  }
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
    await supabase.from('questoes_erradas').insert({
      user_id: userId,
      questao_id: questaoId,
    })
  }
}
