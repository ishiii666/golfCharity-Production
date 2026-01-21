-- Check profile data for the specific user ID from the screenshot
SELECT * FROM profiles WHERE id = 'ef2e5664-6050-4a85-953a-d6c9add5d9f7';

-- Also check if there are any other profiles with similar email to rule out duplicates
SELECT id, email, full_name, phone, state FROM profiles;
