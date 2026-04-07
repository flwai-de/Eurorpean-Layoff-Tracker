INSERT INTO industries (slug, name_en, name_de, parent_slug, sort_order) VALUES
  ('consumer_goods', 'Consumer Goods', 'Konsumgüter', NULL, 0),
  ('chemicals', 'Chemicals', 'Chemie', NULL, 0),
  ('semiconductors', 'Semiconductors', 'Halbleiter', 'technology', 0),
  ('mining_steel', 'Mining & Steel', 'Bergbau & Stahl', 'manufacturing', 0)
ON CONFLICT (slug) DO NOTHING;
