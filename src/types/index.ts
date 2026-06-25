export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'cancelled'

export interface Profile {
  id: string
  user_id: string
  full_name: string | null
  product_name: string
  cost_price: number
  selling_price: number
  partner_split: number
  subscription_status: SubscriptionStatus
  subscription_end_date: string | null
  trial_end_date: string | null
  created_at: string
}

export interface Sale {
  id: string
  user_id: string
  date: string
  order_number: string | null
  delivery_type: 'proprio' | 'transportadora'
  freight_cost: number
  cost_price: number
  selling_price: number
  profit: number
  month: string
  created_at: string
}

export interface MonthlyCost {
  id: string
  user_id: string
  month: string
  traffic_cost: number
  other_costs: number
  other_description: string | null
  total_costs: number
  created_at: string
}

export interface MonthlySummary {
  month: string
  total_sales: number
  gross_profit: number
  total_costs: number
  net_profit: number
  my_share: number
  partner_share: number
  goal_reached: boolean
}
