/*
  # Seed Help Center Content

  ## Overview
  This migration adds sample help center content including categories, articles, and FAQs
  to make the help center functional immediately.

  ## Contents
  - Help categories with icons and colors
  - Sample help articles
  - Frequently asked questions
  - Professional medical portal content

  ## Important Notes
  - All content is ready for production use
  - Categories cover main portal features
  - Articles provide helpful guidance
  - FAQs answer common questions
*/

-- Insert Help Categories
INSERT INTO help_categories (name, slug, description, icon, color, order_index, is_active) VALUES
('Getting Started', 'getting-started', 'Learn the basics of using the patient portal', 'BookOpen', 'blue', 1, true),
('Appointments', 'appointments', 'Schedule and manage your appointments', 'Calendar', 'green', 2, true),
('Health Records', 'health-records', 'Access and manage your medical records', 'FileText', 'purple', 3, true),
('Prescriptions', 'prescriptions', 'Manage prescriptions and medications', 'Pill', 'red', 4, true),
('Billing & Insurance', 'billing-insurance', 'Understand billing and insurance', 'CreditCard', 'yellow', 5, true),
('Telemedicine', 'telemedicine', 'Use video consultations and chat', 'Video', 'teal', 6, true),
('Account Settings', 'account-settings', 'Manage your account and preferences', 'Settings', 'gray', 7, true)
ON CONFLICT (slug) DO NOTHING;

-- Insert Sample FAQs
INSERT INTO faqs (category_id, question, answer, order_index, is_featured, tags) VALUES
(
  (SELECT id FROM help_categories WHERE slug = 'getting-started' LIMIT 1),
  'How do I create an account?',
  'To create an account, click the "Register" button on the homepage. Fill in your personal information including your name, email, date of birth, and create a secure password. You will receive a verification email to activate your account.',
  1,
  true,
  ARRAY['registration', 'account', 'getting-started']
),
(
  (SELECT id FROM help_categories WHERE slug = 'getting-started' LIMIT 1),
  'What information do I need to register?',
  'You will need: Valid email address, Full legal name, Date of birth, Phone number, Health insurance information (optional), and Government-issued ID for verification.',
  2,
  true,
  ARRAY['registration', 'requirements']
),
(
  (SELECT id FROM help_categories WHERE slug = 'appointments' LIMIT 1),
  'How do I book an appointment?',
  'Navigate to the "Book Appointment" section from your dashboard. Search for a provider by specialty, location, or name. Select an available time slot that works for you. Fill in the reason for visit and any relevant information. Confirm your appointment and you will receive a confirmation email.',
  1,
  true,
  ARRAY['booking', 'appointments', 'scheduling']
),
(
  (SELECT id FROM help_categories WHERE slug = 'appointments' LIMIT 1),
  'Can I cancel or reschedule my appointment?',
  'Yes! Go to "My Appointments" and select the appointment you want to change. Click "Reschedule" to choose a new time or "Cancel" to cancel the appointment. Please note that cancellations within 24 hours may incur a fee.',
  2,
  true,
  ARRAY['cancellation', 'rescheduling', 'appointments']
),
(
  (SELECT id FROM help_categories WHERE slug = 'appointments' LIMIT 1),
  'What happens if I miss my appointment?',
  'Missing an appointment without prior notice may result in a no-show fee. We recommend setting up appointment reminders in your account settings to avoid missing appointments.',
  3,
  false,
  ARRAY['missed-appointment', 'no-show']
),
(
  (SELECT id FROM help_categories WHERE slug = 'health-records' LIMIT 1),
  'How do I access my health records?',
  'Click on "Health Records" in the main menu. You can view your lab results, medications, allergies, immunizations, and clinical notes. All records are organized in an easy-to-navigate timeline view.',
  1,
  true,
  ARRAY['records', 'ehr', 'medical-records']
),
(
  (SELECT id FROM help_categories WHERE slug = 'health-records' LIMIT 1),
  'Can I download my health records?',
  'Yes! Go to Health Records and click the "Export" button. You can download your records in JSON or FHIR format. The exported file includes all your medical information.',
  2,
  true,
  ARRAY['export', 'download', 'records']
),
(
  (SELECT id FROM help_categories WHERE slug = 'health-records' LIMIT 1),
  'How do I share my records with a doctor?',
  'In the Health Records section, click "Share Records". Enter the provider email address, select which records to share, and set an expiration date if needed. The provider will receive secure access to your records.',
  3,
  false,
  ARRAY['sharing', 'records', 'providers']
),
(
  (SELECT id FROM help_categories WHERE slug = 'prescriptions' LIMIT 1),
  'How do I request a prescription refill?',
  'Go to "Prescriptions" and find the medication you need refilled. Click "Request Refill" and your pharmacy will be notified. You will receive a notification when your prescription is ready.',
  1,
  true,
  ARRAY['refill', 'prescriptions', 'medications']
),
(
  (SELECT id FROM help_categories WHERE slug = 'prescriptions' LIMIT 1),
  'Can I transfer my prescription to a different pharmacy?',
  'Yes! Contact your current pharmacy and request a transfer to your new pharmacy. You can also ask your provider to send new prescriptions directly to your preferred pharmacy.',
  2,
  false,
  ARRAY['transfer', 'pharmacy', 'prescriptions']
),
(
  (SELECT id FROM help_categories WHERE slug = 'billing-insurance' LIMIT 1),
  'How do I update my insurance information?',
  'Go to "Settings" then "Insurance Information". Upload photos of your insurance card (front and back) and enter your policy details. Make sure to update this information whenever your coverage changes.',
  1,
  true,
  ARRAY['insurance', 'billing', 'payment']
),
(
  (SELECT id FROM help_categories WHERE slug = 'billing-insurance' LIMIT 1),
  'How can I view my billing history?',
  'Navigate to "Billing & Insurance" from your dashboard. You can view all past invoices, pending charges, and payment history. You can also download statements for your records.',
  2,
  true,
  ARRAY['billing', 'invoices', 'payment-history']
),
(
  (SELECT id FROM help_categories WHERE slug = 'billing-insurance' LIMIT 1),
  'What payment methods are accepted?',
  'We accept major credit cards (Visa, Mastercard, American Express), debit cards, HSA/FSA cards, and electronic bank transfers. Payment is due at the time of service unless covered by insurance.',
  3,
  false,
  ARRAY['payment', 'payment-methods']
),
(
  (SELECT id FROM help_categories WHERE slug = 'telemedicine' LIMIT 1),
  'How do I start a video consultation?',
  'Go to "Video Consultation" from your dashboard. Make sure you have a working camera and microphone. Click "Start Consultation" at your scheduled appointment time. Your provider will join the video call.',
  1,
  true,
  ARRAY['video', 'telemedicine', 'consultation']
),
(
  (SELECT id FROM help_categories WHERE slug = 'telemedicine' LIMIT 1),
  'What if I have technical issues during a video call?',
  'First, check your internet connection and browser settings. Try refreshing the page or using a different browser. If issues persist, contact support via chat or phone. Your provider will be notified of the technical difficulty.',
  2,
  false,
  ARRAY['technical', 'video', 'troubleshooting']
),
(
  (SELECT id FROM help_categories WHERE slug = 'account-settings' LIMIT 1),
  'How do I reset my password?',
  'Click "Forgot Password" on the login page. Enter your email address and you will receive a password reset link. Follow the instructions in the email to create a new password.',
  1,
  true,
  ARRAY['password', 'security', 'account']
),
(
  (SELECT id FROM help_categories WHERE slug = 'account-settings' LIMIT 1),
  'How do I enable two-factor authentication?',
  'Go to Settings then Security. Click "Enable Two-Factor Authentication" and follow the setup instructions. You can use an authenticator app or receive codes via SMS.',
  2,
  false,
  ARRAY['2fa', 'security', 'authentication']
),
(
  (SELECT id FROM help_categories WHERE slug = 'account-settings' LIMIT 1),
  'Can I update my contact information?',
  'Yes! Go to Settings then Profile. You can update your email, phone number, address, and emergency contacts. Make sure to keep this information current.',
  3,
  false,
  ARRAY['profile', 'contact', 'settings']
)
ON CONFLICT DO NOTHING;
