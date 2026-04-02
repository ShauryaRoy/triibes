-- Migration: Add approved_at column to applications table for lazy expiry feature
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "approved_at" timestamp;
