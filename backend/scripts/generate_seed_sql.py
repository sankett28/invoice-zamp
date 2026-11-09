import sys, os, json, uuid
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from scripts.seed import VENDORS, PURCHASE_ORDERS

vendor_ids = {v['vendor_code']: str(uuid.uuid5(uuid.NAMESPACE_DNS, v['vendor_code'])) for v in VENDORS}

lines = []
for v in VENDORS:
    vid = vendor_ids[v['vendor_code']]
    tax = f"'{v['tax_id']}'" if v['tax_id'] else 'NULL'
    lines.append(f"INSERT INTO vendors (id, vendor_code, legal_name, normalised_name, tax_id, status, created_at) VALUES ('{vid}', '{v['vendor_code']}', '{v['legal_name']}', '{v['normalised_name']}', {tax}, '{v['status']}', NOW()) ON CONFLICT (vendor_code) DO NOTHING;")

for po in PURCHASE_ORDERS:
    poid = str(uuid.uuid5(uuid.NAMESPACE_DNS, po['po_number']))
    vid = vendor_ids[po['vendor_code']]
    items = json.dumps(po.get('line_items', [])).replace("'", "''")
    desc = po.get('description', '').replace("'", "''")
    lines.append(f"INSERT INTO purchase_orders (id, po_number, vendor_id, currency, po_total, po_date, status, description, line_items, created_at) VALUES ('{poid}', '{po['po_number']}', '{vid}', 'INR', {po['po_total']}, '{po['po_date']}', '{po['status']}', '{desc}', '{items}'::json, NOW()) ON CONFLICT (po_number) DO NOTHING;")

out_path = os.path.join(os.path.dirname(__file__), 'supabase_seed.sql')
with open(out_path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))
print('Written to', out_path)
