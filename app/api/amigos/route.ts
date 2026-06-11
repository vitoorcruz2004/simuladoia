import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// GET - busca amigos e convites pendentes
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const [{ data: amigos }, { data: pendentes }, { data: enviados }] = await Promise.all([
    supabase.from('amizades').select('*, amigo:profiles!amizades_amigo_id_fkey(id,nome,email)')
      .eq('user_id', userId).eq('status', 'aceito'),
    supabase.from('amizades').select('*, solicitante:profiles!amizades_user_id_fkey(id,nome,email)')
      .eq('amigo_id', userId).eq('status', 'pendente'),
    supabase.from('amizades').select('*, amigo:profiles!amizades_amigo_id_fkey(id,nome,email)')
      .eq('user_id', userId).eq('status', 'pendente'),
  ])

  // Busca desempenho dos amigos pra ranking
  const amigosIds = (amigos || []).map((a: any) => a.amigo_id)
  let rankingAmigos: any[] = []
  if (amigosIds.length > 0) {
    const semana = getSemana()
    const { data: leaderboard } = await supabase.from('leaderboard')
      .select('*, profiles(nome)')
      .in('user_id', [...amigosIds, userId])
      .eq('semana', semana)
      .order('pontos_semana', { ascending: false })
    rankingAmigos = leaderboard || []
  }

  return NextResponse.json({ amigos, pendentes, enviados, rankingAmigos })
}

// POST - enviar convite ou aceitar/recusar
export async function POST(req: NextRequest) {
  const { acao, userId, amigoId, amizadeId } = await req.json()

  if (acao === 'convidar') {
    // Busca por email ou nome
    const { data: perfil } = await supabase.from('profiles')
      .select('id, nome, email').eq('email', amigoId).single()
    if (!perfil) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

    // Verifica se já existe
    const { data: existe } = await supabase.from('amizades')
      .select('id').eq('user_id', userId).eq('amigo_id', perfil.id).single()
    if (existe) return NextResponse.json({ error: 'Convite já enviado' }, { status: 400 })

    await supabase.from('amizades').insert({ user_id: userId, amigo_id: perfil.id, status: 'pendente' })
    return NextResponse.json({ sucesso: true, perfil })
  }

  if (acao === 'aceitar') {
    await supabase.from('amizades').update({ status: 'aceito' }).eq('id', amizadeId)
    // Cria relação bidirecional
    const { data: amizade } = await supabase.from('amizades').select('*').eq('id', amizadeId).single()
    if (amizade) {
      await supabase.from('amizades').insert({ user_id: amizade.amigo_id, amigo_id: amizade.user_id, status: 'aceito' })
    }
    return NextResponse.json({ sucesso: true })
  }

  if (acao === 'recusar') {
    await supabase.from('amizades').delete().eq('id', amizadeId)
    return NextResponse.json({ sucesso: true })
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
}

function getSemana() {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const week = Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7)
  return `${now.getFullYear()}-W${week}`
}
