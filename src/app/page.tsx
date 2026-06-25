import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { TrendingUp, BarChart3, Users, CheckCircle, Sparkles } from 'lucide-react'
import { ChatWidget } from '@/components/ChatWidget'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <span className="text-xl font-bold text-orange-600">VendaMais</span>
        <div className="flex gap-3">
          <Link href="/login"><Button variant="ghost">Entrar</Button></Link>
          <Link href="/cadastro"><Button className="bg-orange-600 hover:bg-orange-700">Testar grátis</Button></Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="inline-block bg-orange-100 text-orange-700 text-sm font-medium px-3 py-1 rounded-full mb-6">
          7 dias grátis, sem cartão
        </div>
        <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
          Pare de anotar no bloco de notas.<br />
          <span className="text-orange-600">Saiba exatamente quanto você lucra.</span>
        </h1>
        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
          Controle de vendas, custos, divisão de lucros com sócio e resumo mensal — tudo em um lugar só.
        </p>
        <Link href="/cadastro">
          <Button size="lg" className="bg-orange-600 hover:bg-orange-700 text-lg px-8 py-6">
            Começar grátis agora
          </Button>
        </Link>
        <p className="text-sm text-gray-400 mt-4">Sem cartão de crédito. Cancele quando quiser.</p>
      </section>

      {/* AI Chat Section */}
      <section className="bg-gradient-to-b from-orange-50 to-white py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-1.5 bg-orange-100 text-orange-700 text-sm font-medium px-3 py-1 rounded-full mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Grátis — sem cadastro
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Monte sua planilha personalizada em 1 minuto
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Nosso consultor financeiro digital pergunta sobre o seu negócio e gera uma planilha Excel profissional — de graça, sem precisar criar conta.
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-10 items-start justify-center">
            <div className="w-full lg:flex-1 max-w-lg mx-auto lg:mx-0">
              <ChatWidget />
            </div>

            <div className="lg:w-72 space-y-5 pt-2 shrink-0">
              <h3 className="font-semibold text-gray-900 text-base">O que vem na planilha:</h3>
              {[
                { emoji: '📊', title: 'Aba de Vendas', desc: 'Registro de cada venda com custo, frete e lucro automático' },
                { emoji: '💸', title: 'Custos Mensais', desc: 'Controle de tráfego pago e outros gastos fixos' },
                { emoji: '📈', title: 'Resumo do Negócio', desc: 'Lucratividade, meta mensal e divisão com sócio' },
              ].map(item => (
                <div key={item.title} className="flex gap-3">
                  <span className="text-2xl mt-0.5">{item.emoji}</span>
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{item.title}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}

              <div className="mt-6 pt-6 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-3">Quer controlar isso todo dia?</p>
                <Link href="/cadastro">
                  <Button className="w-full bg-orange-600 hover:bg-orange-700 text-sm">
                    Testar o VendaMais grátis →
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Tudo que você precisa para controlar seu negócio</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: TrendingUp, title: 'Registro de vendas', desc: 'Registre cada venda em segundos. Entrega própria ou transportadora — o lucro calcula automático.' },
              { icon: BarChart3, title: 'Resumo mensal', desc: 'Veja o lucro líquido real do mês, com todos os custos de tráfego pago descontados.' },
              { icon: Users, title: 'Divisão com sócio', desc: 'Configure a % de cada sócio e veja na hora quanto é de cada um no fim do mês.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl p-6 shadow-sm border">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 max-w-3xl mx-auto px-6 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Preço simples e justo</h2>
        <p className="text-gray-500 mb-12">Sem planos confusos. Um preço, acesso completo.</p>
        <div className="bg-white border-2 border-orange-500 rounded-3xl p-10 shadow-lg inline-block w-full max-w-sm">
          <div className="text-orange-600 font-semibold mb-2">Mensal</div>
          <div className="text-5xl font-bold text-gray-900 mb-1">R$ 29<span className="text-xl font-normal text-gray-400">/mês</span></div>
          <p className="text-gray-500 text-sm mb-8">Cobrado via PIX ou cartão de crédito</p>
          <ul className="text-left space-y-3 mb-8">
            {['Vendas ilimitadas', 'Custos mensais', 'Resumo e metas', 'Divisão com sócio', 'Suporte via WhatsApp'].map(item => (
              <li key={item} className="flex items-center gap-2 text-sm text-gray-700">
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />{item}
              </li>
            ))}
          </ul>
          <Link href="/cadastro">
            <Button className="w-full bg-orange-600 hover:bg-orange-700">Começar 7 dias grátis</Button>
          </Link>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-gray-400">
        © 2026 VendaMais. Todos os direitos reservados.
      </footer>
    </div>
  )
}
