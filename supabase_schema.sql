-- Rodar no SQL Editor do Supabase

create table profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique not null,
  full_name text,
  product_name text not null default 'Meu Produto',
  cost_price numeric(10,2) not null default 0,
  selling_price numeric(10,2) not null default 0,
  partner_split numeric(5,2) not null default 50,
  monthly_goal numeric(10,2) not null default 39000,
  subscription_status text not null default 'trial' check (subscription_status in ('trial','active','expired','cancelled')),
  subscription_end_date timestamptz,
  trial_end_date timestamptz default (now() + interval '7 days'),
  created_at timestamptz default now()
);

create table sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null default current_date,
  order_number text,
  delivery_type text not null default 'proprio' check (delivery_type in ('proprio','transportadora')),
  freight_cost numeric(10,2) not null default 0,
  cost_price numeric(10,2) not null,
  selling_price numeric(10,2) not null,
  profit numeric(10,2) generated always as (selling_price - cost_price - freight_cost) stored,
  month text,
  created_at timestamptz default now()
);

create table monthly_costs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  month text not null,
  traffic_cost numeric(10,2) not null default 0,
  other_costs numeric(10,2) not null default 0,
  other_description text,
  total_costs numeric(10,2) generated always as (traffic_cost + other_costs) stored,
  created_at timestamptz default now(),
  unique(user_id, month)
);

-- Trigger para preencher o campo month automaticamente
create or replace function fill_sale_month()
returns trigger language plpgsql as $$
begin
  new.month := to_char(new.date, 'MM/YYYY');
  return new;
end;
$$;

create trigger sales_fill_month
  before insert or update on sales
  for each row execute function fill_sale_month();

-- RLS
alter table profiles enable row level security;
alter table sales enable row level security;
alter table monthly_costs enable row level security;

create policy "users see own profile" on profiles for all using (auth.uid() = user_id);
create policy "users see own sales" on sales for all using (auth.uid() = user_id);
create policy "users see own costs" on monthly_costs for all using (auth.uid() = user_id);

-- Trigger para criar profile automaticamente no signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (user_id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
