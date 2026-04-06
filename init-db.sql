-- Enable pg_trgm for fuzzy company name search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create separate database for Umami analytics
CREATE DATABASE umami;
