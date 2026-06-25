'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Download, Bot, Loader2, Rocket } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface PlanilhaData {
  product_name: string
  cost_price: number
  selling_price: number
  delivery_cost: number
  has_partner: boolean
  partner_split: number
  monthly_goal: number
}

const GREETING = `Oi! Sou o Max, seu consultor financeiro VendaMais 🚀

Em poucos minutos monto uma planilha Excel personalizada pro seu negócio — de graça, sem cadastro!

Me conta: **o que você revende?**`

function extractPlanilha(text: string): PlanilhaData | null {
  const marker = 'PLANILHA_PRONTA:'
  const idx = text.indexOf(marker)
  if (idx === -1) return null
  try {
    return JSON.parse(text.slice(idx + marker.length).trim())
  } catch {
    return null
  }
}

export function ChatWidget() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: GREETING },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [planilhaData, setPlanilhaData] = useState<PlanilhaData | null>(null)
  const [downloading, setDownloading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send() {
    if (!input.trim() || loading) return

    const userText = input.trim()
    setInput('')

    const updated: Message[] = [...messages, { role: 'user', content: userText }]
    setMessages(updated)
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updated.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.body) throw new Error('no body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      let assistantText = ''

      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6)
          if (payload === '[DONE]') break
          try {
            const parsed = JSON.parse(payload)
            if (parsed.text) {
              assistantText += parsed.text
              setMessages(prev => [
                ...prev.slice(0, -1),
                { role: 'assistant', content: assistantText },
              ])
            }
          } catch { /* partial chunk */ }
        }
      }

      const planilha = extractPlanilha(assistantText)
      if (planilha) {
        setPlanilhaData(planilha)
        const clean = assistantText.slice(0, assistantText.indexOf('PLANILHA_PRONTA:')).trim()
        setMessages(prev => [
          ...prev.slice(0, -1),
          {
            role: 'assistant',
            content: clean || 'Perfeito! Sua planilha personalizada está pronta! 🎉 Clique em baixar abaixo.',
          },
        ])
      }
    } catch {
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: 'Ops, tive um problema de conexão. Tente de novo!' },
      ])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  function goToApp() {
    if (!planilhaData) return
    localStorage.setItem('vendamais_prefill', JSON.stringify({
      product_name: planilhaData.product_name,
      cost_price: planilhaData.cost_price,
      selling_price: planilhaData.selling_price,
      // DB usa "sua %" no lucro — inverte a % do sócio
      partner_split: planilhaData.has_partner ? 100 - planilhaData.partner_split : 100,
      monthly_goal: planilhaData.monthly_goal,
    }))
    router.push('/cadastro')
  }

  async function downloadPlanilha() {
    if (!planilhaData) return
    setDownloading(true)
    try {
      const res = await fetch('/api/planilha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planilhaData),
      })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `VendaMais-${planilhaData.product_name.replace(/[^a-zA-Z0-9]/g, '-')}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  const done = !!planilhaData

  return (
    <div className="w-full max-w-lg mx-auto bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden" style={{ height: 520 }}>
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-500 px-5 py-4 flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-white font-semibold text-sm leading-tight">Max — VendaMais</p>
          <p className="text-orange-100 text-xs">Consultor Financeiro · Online agora</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-orange-100 text-xs">ao vivo</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-orange-600 text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-800 rounded-bl-sm'
              }`}
            >
              {msg.content
                ? msg.content.split('**').map((part, j) =>
                    j % 2 === 1 ? <strong key={j}>{part}</strong> : <span key={j}>{part}</span>
                  )
                : loading && i === messages.length - 1
                  ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  : null}
            </div>
          </div>
        ))}

        {done && (
          <div className="flex flex-col gap-2 pt-1">
            <button
              onClick={goToApp}
              className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white px-5 py-3 rounded-2xl text-sm font-semibold shadow-lg transition-all hover:scale-105"
            >
              <Rocket className="w-4 h-4" />
              Entrar no VendaMais com esses dados
            </button>
            <button
              onClick={downloadPlanilha}
              disabled={downloading}
              className="flex items-center justify-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 px-5 py-2.5 rounded-2xl text-sm font-medium transition-all disabled:opacity-70"
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {downloading ? 'Gerando...' : 'Só baixar a planilha Excel'}
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 pb-3 pt-2 border-t bg-white shrink-0">
        {done ? (
          <p className="text-center text-xs text-gray-400 py-1">
            Planilha pronta!{' '}
            <button
              className="text-orange-600 underline"
              onClick={() => {
                setMessages([{ role: 'assistant', content: GREETING }])
                setPlanilhaData(null)
              }}
            >
              Recomeçar
            </button>
          </p>
        ) : (
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Digite sua resposta..."
              disabled={loading}
              autoFocus
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50 transition-shadow"
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl px-3 py-2.5 disabled:opacity-40 transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
