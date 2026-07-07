-- Migration to add additional_image_urls to products

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS additional_image_urls text[] not null default '{}';
