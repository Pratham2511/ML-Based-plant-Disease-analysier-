-- Sample normalized medicine catalog for ShetVaidya.
-- Extend this list to include your full domain-approved medicine inventory.

INSERT INTO medicines (id, brand_name, company, active_ingredient, concentration, crop_type, disease_category)
VALUES
('11111111-1111-1111-1111-111111111101', 'Dithane M-45', 'Indofil', 'Mancozeb', '75% WP', 'tomato', 'early_blight'),
('11111111-1111-1111-1111-111111111102', 'Kocide 3000', 'UPL', 'Copper Hydroxide', '46.1% DF', 'tomato', 'bacterial_spot'),
('11111111-1111-1111-1111-111111111103', 'Ridomil Gold', 'Syngenta', 'Metalaxyl + Mancozeb', '8% + 64% WP', 'potato', 'late_blight'),
('11111111-1111-1111-1111-111111111104', 'Amistar Top', 'Syngenta', 'Azoxystrobin + Difenoconazole', '18.2% + 11.4% SC', 'tomato', 'target_spot'),
('11111111-1111-1111-1111-111111111105', 'Confidor', 'Bayer', 'Imidacloprid', '17.8% SL', 'tomato', 'whitefly_vector_control'),
('11111111-1111-1111-1111-111111111106', 'Nativo', 'Bayer', 'Trifloxystrobin + Tebuconazole', '75 WG', 'bell_pepper', 'leaf_spot')
ON CONFLICT ON CONSTRAINT uq_medicine_normalized DO NOTHING;

INSERT INTO medicine_batches (id, medicine_id, batch_code, batch_size, manufacture_date, is_valid)
VALUES
('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111101', 'AG-TOM-EB-250301-A', 100, '2025-03-01', TRUE),
('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111103', 'AG-POT-LB-250215-B', 100, '2025-02-15', TRUE),
('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111106', 'AG-BPEP-LS-250120-C', 100, '2025-01-20', TRUE)
ON CONFLICT DO NOTHING;
