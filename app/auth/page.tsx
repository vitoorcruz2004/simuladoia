'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [nome, setNome] = useState('')
  const [modo, setModo] = useState<'login' | 'cadastro'>('login')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro('')

    if (modo === 'cadastro') {
      const { error } = await supabase.auth.signUp({ email, password: senha })
      if (error) { setErro(error.message); setLoading(false); return }
      // atualiza nome no profile
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await supabase.from('profiles').update({ nome }).eq('id', user.id)
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
      if (error) { setErro('Email ou senha incorretos'); setLoading(false); return }
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{background:'#09090B'}}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="text-2xl font-extrabold tracking-tight">
            Simulado<span style={{color:'#818CF8'}}>IA</span>
          </div>
          <p className="text-zinc-400 text-sm mt-2">
            {modo === 'login' ? 'Entre na sua conta' : 'Crie sua conta grátis'}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-zinc-800 p-8" style={{background:'#111113'}}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {modo === 'cadastro' && (
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">Nome</label>
                <input
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Seu nome"
                  required
                  className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all"
                  style={{background:'#18181B', border:'1px solid #27272A', color:'#FAFAFA'}}
                  onFocus={e => e.target.style.borderColor='#6366F1'}
                  onBlur={e => e.target.style.borderColor='#27272A'}
                />
              </div>
            )}
            <div>
              <label className="text-sm text-zinc-400 mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all"
                style={{background:'#18181B', border:'1px solid #27272A', color:'#FAFAFA'}}
                onFocus={e => e.target.style.borderColor='#6366F1'}
                onBlur={e => e.target.style.borderColor='#27272A'}
              />
            </div>
            <div>
              <label className="text-sm text-zinc-400 mb-1 block">Senha</label>
              <input
                type="password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all"
                style={{background:'#18181B', border:'1px solid #27272A', color:'#FAFAFA'}}
                onFocus={e => e.target.style.borderColor='#6366F1'}
                onBlur={e => e.target.style.borderColor='#27272A'}
              />
            </div>

            {erro && <p className="text-red-400 text-sm">{erro}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg font-bold text-sm transition-all mt-2"
              style={{background: loading ? '#4f46e5' : '#6366F1', color:'#fff', opacity: loading ? 0.7 : 1}}
            >
              {loading ? 'Aguarde...' : modo === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>

          <p className="text-center text-sm text-zinc-500 mt-6">
            {modo === 'login' ? 'Não tem conta?' : 'Já tem conta?'}{' '}
            <button
              onClick={() => setModo(modo === 'login' ? 'cadastro' : 'login')}
              className="font-semibold"
              style={{color:'#818CF8'}}
            >
              {modo === 'login' ? 'Criar grátis' : 'Entrar'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
