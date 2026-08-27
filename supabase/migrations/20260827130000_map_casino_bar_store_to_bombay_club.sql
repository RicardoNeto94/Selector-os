-- Casino Bar Beverages is operated as part of the Bombay Club venue in
-- Vaxeron. Keep the immutable Compucash store identity, but attach it to the
-- active Bombay Club location.
--
-- This is a reassignment, not an inventory addition. Existing Casino Bar
-- inventory and valuation rows are moved into Bombay Club. When the same wine
-- already exists at Bombay Club, the Compucash Casino Bar row replaces it so
-- stock cannot be counted twice.

do $$
declare
  old_location_id constant uuid := '9a5816fd-159d-4bba-b274-01766f90b10b'::uuid;
  new_location_id constant uuid := 'f8762405-c48c-42e6-94ff-fc526abf8adb'::uuid;
begin
  update public.wine_location_store_mappings
  set location_id = new_location_id
  where business_store_name = 'Casino Bar Beverages'
    and location_id = old_location_id;

  update public.wine_inventory as target
  set
    location = 'Bombay Club',
    stock = source.stock,
    quantity = source.quantity,
    cost_value = source.cost_value,
    cost_price = source.cost_price,
    cost_updated_at = source.cost_updated_at,
    organization_id = source.organization_id,
    property_id = source.property_id
  from public.wine_inventory as source
  where source.location_id = old_location_id
    and target.location_id = new_location_id
    and target.wine_id = source.wine_id;

  update public.wine_inventory as source
  set
    location_id = new_location_id,
    location = 'Bombay Club'
  where source.location_id = old_location_id
    and not exists (
      select 1
      from public.wine_inventory as target
      where target.location_id = new_location_id
        and target.wine_id = source.wine_id
    );

  -- These remaining rows are duplicate keys whose complete values were copied
  -- to Bombay Club above.
  delete from public.wine_inventory
  where location_id = old_location_id;

  update public.wine_inventory_valuations as target
  set
    external_product_id = source.external_product_id,
    external_store_ids = source.external_store_ids,
    quantity_snapshot = source.quantity_snapshot,
    cost_covered_quantity = source.cost_covered_quantity,
    unit_inventory_cost = source.unit_inventory_cost,
    inventory_cost_value = source.inventory_cost_value,
    unit_sale_price_gross = source.unit_sale_price_gross,
    unit_sale_price_net = source.unit_sale_price_net,
    vat_percent = source.vat_percent,
    sale_price_group_id = source.sale_price_group_id,
    currency_code = source.currency_code,
    cost_basis = source.cost_basis,
    source_updated_at = source.source_updated_at,
    updated_at = source.updated_at,
    organization_id = source.organization_id,
    property_id = source.property_id
  from public.wine_inventory_valuations as source
  where source.location_id = old_location_id
    and target.location_id = new_location_id
    and target.wine_id = source.wine_id
    and target.source = source.source;

  update public.wine_inventory_valuations as source
  set location_id = new_location_id
  where source.location_id = old_location_id
    and not exists (
      select 1
      from public.wine_inventory_valuations as target
      where target.location_id = new_location_id
        and target.wine_id = source.wine_id
        and target.source = source.source
    );

  delete from public.wine_inventory_valuations
  where location_id = old_location_id;
end;
$$;
