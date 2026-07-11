DROP FUNCTION IF EXISTS public.get_sales_analytics(text, timestamptz, timestamptz);
DROP TABLE IF EXISTS public.operational_costs CASCADE;
DROP TABLE IF EXISTS public.premises_expenses CASCADE;
DROP TYPE IF EXISTS public.cost_category;
DROP TYPE IF EXISTS public.billing_period;
DROP TYPE IF EXISTS public.expense_status;