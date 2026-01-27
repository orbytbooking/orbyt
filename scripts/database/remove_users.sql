-- SQL Query to remove specific users
-- Run this in Supabase SQL Editor

-- Option 1: Delete users one by one
DELETE FROM auth.users WHERE id = '6576f799-8952-4fa4-8ee4-7c2efd826f6a';
DELETE FROM auth.users WHERE id = 'd4bb016a-7899-4d37-8b77-e1c154a95bcb';

-- Option 2: Delete users in a single query
DELETE FROM auth.users 
WHERE id IN ('6576f799-8952-4fa4-8ee4-7c2efd826f6a', 'd4bb016a-7899-4d37-8b77-e1c154a95bcb');

-- Also clean up related records in service_providers if they exist
DELETE FROM service_providers 
WHERE user_id IN ('6576f799-8952-4fa4-8ee4-7c2efd826f6a', 'd4bb016a-7899-4d37-8b77-e1c154a95bcb');

-- Clean up any provider invitations if they exist
DELETE FROM provider_invitations 
WHERE email IN ('chris.taylor@test.com', 'emma.wilson@test.com');

-- Verify deletion
SELECT 'Users deleted successfully' as status;
