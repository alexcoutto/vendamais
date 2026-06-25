import { NextRequest } from 'next/server'
import ExcelJS from 'exceljs'

const ORANGE = 'FFEA580C'
const LIGHT_ORANGE = 'FFFED7AA'
const DARK = 'FF111827'
const GRAY = 'FF6B7280'

function headerStyle(sheet: ExcelJS.Worksheet, rowNum: number) {
  const row = sheet.getRow(rowNum)
  row.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ORANGE } }
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  })
  row.height = 22
}

export async function POST(req: NextRequest) {
  const data = await req.json()
  const {
    product_name,
    cost_price,
    selling_price,
    delivery_cost,
    has_partner,
    partner_split,
    monthly_goal,
  } = data

  const lucroUnitario = selling_price - cost_price - delivery_cost
  const vendasParaMeta = lucroUnitario > 0 ? Math.ceil(monthly_goal / lucroUnitario) : 0
  const lucroSocio = has_partner ? Math.round(monthly_goal * (partner_split / 100)) : 0
  const lucroSeu = monthly_goal - lucroSocio

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'VendaMais'
  workbook.created = new Date()

  // ── Aba 1: Vendas ──
  const vendas = workbook.addWorksheet('📊 Vendas')
  vendas.columns = [
    { header: 'Data', key: 'data', width: 13 },
    { header: 'Produto', key: 'produto', width: 22 },
    { header: 'Custo (R$)', key: 'custo', width: 13 },
    { header: 'Frete (R$)', key: 'frete', width: 13 },
    { header: 'Venda (R$)', key: 'venda', width: 13 },
    { header: 'Lucro (R$)', key: 'lucro', width: 13 },
  ]
  headerStyle(vendas, 1)

  vendas.addRow({
    data: new Date().toLocaleDateString('pt-BR'),
    produto: product_name,
    custo: cost_price,
    frete: delivery_cost,
    venda: selling_price,
    lucro: lucroUnitario,
  })

  // Formula row for future entries
  vendas.addRow(['', '', '', '', '', ''])
  vendas.addRow(['← Preencha suas vendas aqui. Lucro = Venda - Custo - Frete', '', '', '', '', ''])
  vendas.getRow(3).getCell(1).font = { italic: true, color: { argb: GRAY } }

  // ── Aba 2: Custos Mensais ──
  const custos = workbook.addWorksheet('💸 Custos Mensais')
  custos.columns = [
    { header: 'Mês', key: 'mes', width: 14 },
    { header: 'Tráfego / Marketing (R$)', key: 'trafego', width: 26 },
    { header: 'Outros Custos (R$)', key: 'outros', width: 20 },
    { header: 'Total Custos (R$)', key: 'total', width: 20 },
  ]
  headerStyle(custos, 1)

  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  meses.forEach(mes => custos.addRow({ mes, trafego: 0, outros: 0, total: 0 }))

  // ── Aba 3: Resumo ──
  const resumo = workbook.addWorksheet('📈 Resumo do Negócio')
  resumo.getColumn(1).width = 32
  resumo.getColumn(2).width = 22

  function addTitle(text: string) {
    const row = resumo.addRow([text])
    row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ORANGE } }
    row.getCell(1).font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }
    row.getCell(1).alignment = { horizontal: 'left', indent: 1 }
    row.height = 24
    resumo.mergeCells(`A${row.number}:B${row.number}`)
  }

  function addRow(label: string, value: string | number, highlight = false) {
    const row = resumo.addRow([label, value])
    row.getCell(1).font = { color: { argb: DARK } }
    row.getCell(2).font = { bold: true, color: { argb: highlight ? 'FF16A34A' : DARK } }
    row.getCell(2).alignment = { horizontal: 'right' }
    if (highlight) {
      row.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_ORANGE } }
      })
    }
  }

  addTitle('📦 Produto')
  addRow('Nome do produto', product_name)
  addRow('Custo por unidade', `R$ ${cost_price.toLocaleString('pt-BR')}`)
  addRow('Preço de venda', `R$ ${selling_price.toLocaleString('pt-BR')}`)
  addRow('Custo de entrega', delivery_cost > 0 ? `R$ ${delivery_cost.toLocaleString('pt-BR')}` : 'Própria / sem custo')
  resumo.addRow([])

  addTitle('💰 Lucratividade por Venda')
  addRow('Lucro bruto por unidade', `R$ ${lucroUnitario.toLocaleString('pt-BR')}`, lucroUnitario > 0)
  addRow('Margem de lucro', `${Math.round((lucroUnitario / selling_price) * 100)}%`)
  resumo.addRow([])

  addTitle('🎯 Meta Mensal')
  addRow('Meta de lucro mensal', `R$ ${monthly_goal.toLocaleString('pt-BR')}`)
  addRow('Vendas necessárias para atingir meta', `${vendasParaMeta} vendas`)
  resumo.addRow([])

  if (has_partner) {
    addTitle('🤝 Divisão com Sócio')
    addRow(`Sua parte (${100 - partner_split}%)`, `R$ ${lucroSeu.toLocaleString('pt-BR')}`, true)
    addRow(`Sócio (${partner_split}%)`, `R$ ${lucroSocio.toLocaleString('pt-BR')}`)
    resumo.addRow([])
  }

  addTitle('📅 Resultado Esperado')
  addRow('Lucro líquido mensal estimado', `R$ ${lucroSeu.toLocaleString('pt-BR')}`, true)
  addRow('Faturamento bruto para meta', `R$ ${(selling_price * vendasParaMeta).toLocaleString('pt-BR')}`)

  const buffer = await workbook.xlsx.writeBuffer()
  const filename = `VendaMais-${product_name.replace(/[^a-zA-Z0-9]/g, '-')}.xlsx`

  return new Response(Buffer.from(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
