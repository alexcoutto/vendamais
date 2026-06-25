import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'

const SYSTEM_PROMPT = `Você é Max, consultor financeiro digital do VendaMais, especializado em empreendedores brasileiros que revendem produtos.

Seu objetivo é fazer uma conversa RÁPIDA e OBJETIVA para coletar as informações do negócio e montar uma planilha Excel personalizada e gratuita.

COLETE estas informações, uma por vez:
1. O que a pessoa revende (nome/tipo do produto)
2. Custo por unidade — quanto paga para comprar e revender
3. Preço de venda — quanto cobra do cliente
4. Custo de entrega por venda — entrega própria ou transportadora (valor médio; 0 se não tem custo)
5. Se tem sócio — se sim, qual a % do sócio (ex: 50%, 40%)
6. Meta de lucro mensal — quanto quer tirar de lucro por mês (em reais)

REGRAS:
- Comece se apresentando em 1 frase curta e faça a primeira pergunta
- UMA pergunta por vez, seja direto e animado
- Use linguagem brasileira informal, pode usar emojis
- Se a pessoa já deu alguma informação, não pergunte de novo
- Confirme os números que entender (ex: "Entendi! Custo R$ 458 e vende por R$ 1.300, certo?")
- Quando tiver TODAS as 6 informações, responda SOMENTE com esta linha exata (sem texto antes, sem texto depois):
PLANILHA_PRONTA:{"product_name":"nome do produto","cost_price":458,"selling_price":1300,"delivery_cost":150,"has_partner":true,"partner_split":50,"monthly_goal":45000}

FORMATO dos campos:
- cost_price, selling_price, delivery_cost, monthly_goal: números inteiros sem R$
- has_partner: true ou false
- partner_split: % do sócio (0 se não tem sócio)`

export async function POST(req: NextRequest) {
  const { messages } = await req.json()

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const stream = client.messages.stream({
    model: 'claude-haiku-4-5',
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages,
  })

  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`))
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } catch {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Erro interno. Tente novamente.' })}\n\n`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
