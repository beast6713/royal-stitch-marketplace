-- Insert Profiles (Mock Buyers and Sellers)
-- We use deterministic UUIDs for sellers and buyers so we can reference them easily.
INSERT INTO public.profiles (id, clerk_user_id, full_name, email, role)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'seller_clerk_a', 'Oak & Loop Studio', 'oak@example.com', 'seller'),
  ('22222222-2222-2222-2222-222222222222', 'seller_clerk_b', 'Twine & Charm', 'twine@example.com', 'seller'),
  ('33333333-3333-3333-3333-333333333333', 'seller_clerk_c', 'Golden Knot House', 'golden@example.com', 'seller'),
  ('44444444-4444-4444-4444-444444444444', 'seller_clerk_d', 'Atelier Purl', 'atelier@example.com', 'seller'),
  ('55555555-5555-5555-5555-555555555555', 'buyer_clerk_1', 'Aarohi Singh', 'aarohi@example.com', 'buyer')
ON CONFLICT (id) DO NOTHING;

-- Insert Sellers
INSERT INTO public.sellers (id, user_id, store_name, rating, total_sales)
VALUES 
  ('demo-seller-a', '11111111-1111-1111-1111-111111111111', 'Oak & Loop Studio', 4.9, 120),
  ('demo-seller-b', '22222222-2222-2222-2222-222222222222', 'Twine & Charm', 4.8, 85),
  ('demo-seller-c', '33333333-3333-3333-3333-333333333333', 'Golden Knot House', 4.7, 45),
  ('demo-seller-d', '44444444-4444-4444-4444-444444444444', 'Atelier Purl', 4.9, 210)
ON CONFLICT (id) DO NOTHING;

-- Insert Categories
INSERT INTO public.categories (id, name)
VALUES 
  (1, 'Sweaters'),
  (2, 'Blankets'),
  (3, 'Amigurumi'),
  (4, 'Accessories')
ON CONFLICT (id) DO NOTHING;

-- Insert Products
INSERT INTO public.products (
  id, seller_id, category_id, name, description, price, material, yarn_type, image_url, handmade, 
  compare_at_price, stock_quantity, reserved_quantity, reorder_threshold, status, 
  average_rating, review_count, discount_ends_at, quality_score, counterfeit_risk, price_drop_percent, tags
)
VALUES 
  (
    '10000000-0000-0000-0000-000000000001', 'demo-seller-a', 1, 'Velvet Bloom Cardigan', 
    'A soft hand-crocheted cardigan with a romantic drape, scalloped cuffs, and a boutique finish for cool evenings.', 
    2490.00, 'Wool', 'Merino wool blend', 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=1200&q=80', true, 
    2890.00, 6, 1, 3, 'in_stock', 4.9, 42, '2026-04-20 23:59:59+00', 96, 'low', 14, '{"luxury","cardigan","evening","soft-touch"}'
  ),
  (
    '20000000-0000-0000-0000-000000000002', 'demo-seller-b', 3, 'Moonbeam Bunny', 
    'A cuddly amigurumi rabbit with hand-stitched floral details, perfect for nursery shelves and thoughtful gifting.', 
    1290.00, 'Cotton', 'Combed cotton yarn', 'https://images.unsplash.com/photo-1594040226829-7f251ab46d80?auto=format&fit=crop&w=1200&q=80', true, 
    1490.00, 0, 0, 2, 'out_of_stock', 4.8, 31, '2026-04-16 23:59:59+00', 91, 'low', 13, '{"giftable","nursery","rabbit","soft-toy"}'
  ),
  (
    '30000000-0000-0000-0000-000000000003', 'demo-seller-c', 2, 'Heirloom Cable Throw', 
    'An oversized knitted blanket with rich texture and warm ivory tones designed to elevate beds, sofas, and reading corners.', 
    3290.00, 'Acrylic', 'Chunky acrylic boucle', 'https://images.unsplash.com/photo-1600369672770-985fd30004eb?auto=format&fit=crop&w=1200&q=80', true, 
    3890.00, 3, 1, 4, 'low_stock', 4.7, 18, '2026-04-12 23:59:59+00', 88, 'medium', 15, '{"blanket","sofa","heritage","cozy-home"}'
  ),
  (
    '40000000-0000-0000-0000-000000000004', 'demo-seller-a', 1, 'Forest Crest Pullover', 
    'A contemporary knitted sweater with relaxed shoulders, lofty stitches, and a rich emerald palette for cooler days.', 
    2890.00, 'Wool', 'Brushed alpaca wool', 'https://images.unsplash.com/photo-1584735175315-9d5df23860e6?auto=format&fit=crop&w=1200&q=80', true, 
    null, 8, 2, 3, 'in_stock', 4.9, 27, null, 94, 'low', null, '{"emerald","winter","fashion","pullover"}'
  ),
  (
    '50000000-0000-0000-0000-000000000005', 'demo-seller-b', 3, 'Pocket Panda Friend', 
    'A miniature panda amigurumi with tiny stitched paws and a collector-friendly size that fits perfectly on desks.', 
    990.00, 'Acrylic', 'Soft anti-pill acrylic', 'https://images.unsplash.com/photo-1582562124811-c09040d0a901?auto=format&fit=crop&w=1200&q=80', true, 
    1190.00, 12, 1, 4, 'in_stock', 4.6, 53, '2026-04-14 23:59:59+00', 86, 'low', 17, '{"desk-buddy","miniature","gift","panda"}'
  ),
  (
    '60000000-0000-0000-0000-000000000006', 'demo-seller-c', 2, 'Rosewood Picnic Blanket', 
    'A color-blocked crochet blanket with a warm rosewood palette and a dense stitch pattern that feels luxe and durable.', 
    3590.00, 'Cotton', 'Recycled cotton cord', 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?auto=format&fit=crop&w=1200&q=80', true, 
    3990.00, 2, 1, 3, 'low_stock', 4.8, 22, '2026-04-18 23:59:59+00', 92, 'medium', 10, '{"picnic","outdoor","rosewood","statement-home"}'
  ),
  (
    '70000000-0000-0000-0000-000000000007', 'demo-seller-d', 1, 'Pearl Lattice Sweater', 
    'An airy crochet sweater with pearl lattice sleeves, made to stand out in curated wardrobes and festive edits.', 
    2690.00, 'Cotton', 'Mercerized cotton', 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80', true, 
    3190.00, 7, 2, 3, 'in_stock', 4.9, 29, '2026-04-22 23:59:59+00', 95, 'low', 16, '{"festive","airy","lattice","wardrobe"}'
  ),
  (
    '80000000-0000-0000-0000-000000000008', 'demo-seller-d', 3, 'Celestial Cub Set', 
    'A pair of moon-inspired amigurumi cubs with embroidered constellations, crafted for keepsake gifting and decor.', 
    1490.00, 'Wool', 'Baby wool fleece', 'https://images.unsplash.com/photo-1604176354204-9268737828e4?auto=format&fit=crop&w=1200&q=80', true, 
    1690.00, 0, 0, 2, 'out_of_stock', 4.7, 17, '2026-04-15 23:59:59+00', 89, 'low', 12, '{"celestial","giftable","collectible","moon"}'
  )
ON CONFLICT (id) DO NOTHING;
