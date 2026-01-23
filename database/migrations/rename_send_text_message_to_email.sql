-- Migration: Rename send_text_message to send_email_notification in service_providers table
-- This migration updates the column name to reflect the change from SMS to email notifications

-- First, drop the existing column if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'service_providers' 
        AND column_name = 'send_text_message'
    ) THEN
        ALTER TABLE service_providers DROP COLUMN IF EXISTS send_text_message;
    END IF;
END $$;

-- Add the new column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'service_providers' 
        AND column_name = 'send_email_notification'
    ) THEN
        ALTER TABLE service_providers ADD COLUMN send_email_notification BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Update the comment for the new column
COMMENT ON COLUMN service_providers.send_email_notification IS 'Whether to send email notifications - default: false';

-- Log the migration completion
DO $$
BEGIN
    RAISE NOTICE 'Migration completed: send_text_message column renamed to send_email_notification';
END $$;
