/*
  # Seed Help Center Articles & Fix Ticket Number Default

  1. Changes
    - Set default value on support_tickets.ticket_number using existing generate_ticket_number() function
    - Update help_categories "Health Records" color from purple to cyan
    - Insert 14 help articles across all 7 categories (2 per category)
    - 6 articles marked as featured for homepage display

  2. Important Notes
    - Articles cover all major user workflows: account setup, appointments, health records, prescriptions, billing, telemedicine, settings
    - No security changes needed (existing RLS policies cover these tables)
*/

ALTER TABLE support_tickets ALTER COLUMN ticket_number SET DEFAULT generate_ticket_number();

UPDATE help_categories SET color = 'cyan' WHERE slug = 'health-records';

INSERT INTO help_articles (category_id, title, slug, content, summary, tags, is_featured, is_published, order_index, view_count) VALUES
((SELECT id FROM help_categories WHERE slug = 'getting-started'),
 'How to Create Your DoktoChain Account',
 'how-to-create-account',
 'Welcome to DoktoChain! Creating your account is quick and easy.\n\n**Step 1: Visit the Registration Page**\nClick "Sign Up" on the homepage to get started.\n\n**Step 2: Choose Your Role**\nSelect whether you are a Patient, Healthcare Provider, or Pharmacy.\n\n**Step 3: Enter Your Information**\nFill in your name, email address, and create a secure password. For providers, you will also need your license number.\n\n**Step 4: Verify Your Email**\nCheck your inbox for a verification email and click the confirmation link.\n\n**Step 5: Complete Your Profile**\nAfter logging in, complete your profile with additional details such as your address, insurance information (for patients), or practice details (for providers).\n\nOnce your profile is complete, you can start booking appointments, managing your health records, and accessing all platform features.',
 'A step-by-step guide to creating and setting up your DoktoChain account.',
 ARRAY['registration', 'signup', 'account', 'getting started'],
 true, true, 1, 245),

((SELECT id FROM help_categories WHERE slug = 'getting-started'),
 'Navigating Your Dashboard',
 'navigating-your-dashboard',
 'Your DoktoChain dashboard is your central hub for managing healthcare.\n\n**Dashboard Overview**\nAfter logging in, you will see your personalized dashboard with quick access to:\n- Upcoming appointments\n- Recent messages\n- Health records summary\n- Prescription status\n- Notifications\n\n**Sidebar Navigation**\nUse the left sidebar to access different sections:\n- **Appointments**: Book, view, and manage your appointments\n- **Health Records**: Access your medical history, lab results, and more\n- **Prescriptions**: View active prescriptions and request refills\n- **Messages**: Communicate securely with your healthcare providers\n- **Billing**: View invoices and manage payment methods\n\n**Quick Actions**\nThe top of your dashboard features quick action buttons for common tasks like booking an appointment or starting a video consultation.',
 'Learn how to navigate your DoktoChain dashboard and find key features.',
 ARRAY['dashboard', 'navigation', 'overview', 'getting started'],
 true, true, 2, 189),

((SELECT id FROM help_categories WHERE slug = 'appointments'),
 'How to Book an Appointment',
 'how-to-book-appointment',
 'Booking an appointment on DoktoChain is straightforward.\n\n**Finding a Provider**\n1. Go to "Find Providers" from your dashboard or the main navigation\n2. Search by specialty, condition, location, or provider name\n3. Filter results by availability, insurance accepted, language, and more\n4. Review provider profiles including credentials, reviews, and fees\n\n**Selecting a Time Slot**\n1. Click "Book Appointment" on the provider''s profile\n2. Choose between in-person or virtual consultation\n3. Select your preferred date and available time slot\n4. The calendar shows real-time availability\n\n**Completing the Booking**\n1. Select your insurance card or choose self-pay\n2. Complete any required pre-visit questionnaires\n3. Review the appointment details and fees\n4. Confirm your booking\n\nYou will receive a confirmation email and notification with your appointment details.',
 'Step-by-step guide to finding providers and booking appointments on DoktoChain.',
 ARRAY['booking', 'appointment', 'schedule', 'provider'],
 true, true, 1, 312),

((SELECT id FROM help_categories WHERE slug = 'appointments'),
 'Rescheduling or Cancelling an Appointment',
 'reschedule-cancel-appointment',
 'Need to change your appointment? Here is how to reschedule or cancel.\n\n**Rescheduling**\n1. Go to your Appointments page\n2. Find the appointment you want to change\n3. Click the "Reschedule" button\n4. Select a new date and time from the provider''s available slots\n5. Confirm the new time\n\n**Cancellation Policy**\n- Most appointments can be cancelled up to 24 hours before the scheduled time without any charge\n- Late cancellations (within 24 hours) may be subject to a cancellation fee set by the provider\n- No-shows may also incur a fee\n\n**How to Cancel**\n1. Navigate to your Appointments page\n2. Click the "Cancel" button on the appointment\n3. Select a reason for cancellation\n4. Confirm the cancellation\n\nYou will receive a confirmation of the cancellation. Any pre-paid fees will be refunded according to the cancellation policy.',
 'Learn how to reschedule or cancel appointments and understand cancellation policies.',
 ARRAY['reschedule', 'cancel', 'appointment', 'policy'],
 false, true, 2, 178),

((SELECT id FROM help_categories WHERE slug = 'health-records'),
 'Understanding Your Health Records',
 'understanding-health-records',
 'DoktoChain gives you full access to your health records in one place.\n\n**What You Can Access**\n- **Medical History**: Conditions, diagnoses, and past treatments\n- **Lab Results**: Blood work, imaging, and other test results\n- **Medications**: Current and past prescriptions\n- **Allergies**: Known allergies and sensitivities\n- **Immunizations**: Vaccination records\n- **Clinical Notes**: Visit summaries from your providers\n\n**Viewing Your Records**\n1. Navigate to "Health Records" from your dashboard\n2. Use the tabs to switch between different record types\n3. Click on any record to view full details\n4. Use the timeline view to see your health history chronologically\n\n**Sharing Your Records**\nYou can securely share your health records with other providers:\n1. Click "Share Records" on any record\n2. Select the provider you want to share with\n3. Choose the time window for access\n4. The provider will have read-only access for the specified period\n\nAll record access is logged in your consent and audit trail for complete transparency.',
 'A comprehensive guide to viewing, understanding, and sharing your health records.',
 ARRAY['health records', 'medical history', 'lab results', 'sharing'],
 true, true, 1, 267),

((SELECT id FROM help_categories WHERE slug = 'health-records'),
 'Exporting and Downloading Your Records',
 'exporting-downloading-records',
 'You can export your health records in multiple formats.\n\n**Export Options**\n- **PDF**: Best for printing or sharing via email\n- **FHIR R4 JSON**: Standard healthcare interoperability format\n- **CSV**: For data analysis in spreadsheet applications\n\n**How to Export**\n1. Go to your Health Records section\n2. Select the records you want to export\n3. Click the "Export" button\n4. Choose your preferred format\n5. The file will be downloaded to your device\n\n**Privacy Note**\nExported files contain sensitive medical information. Please handle them securely and share only with trusted parties.',
 'Learn how to export and download your health records in various formats.',
 ARRAY['export', 'download', 'records', 'FHIR', 'PDF'],
 false, true, 2, 134),

((SELECT id FROM help_categories WHERE slug = 'prescriptions'),
 'How Prescriptions Work on DoktoChain',
 'how-prescriptions-work',
 'DoktoChain streamlines the prescription process from provider to pharmacy.\n\n**Receiving a Prescription**\nAfter a consultation, your provider can write an electronic prescription directly through DoktoChain. You will receive a notification when a new prescription is available.\n\n**Viewing Your Prescriptions**\n1. Go to the Prescriptions section of your dashboard\n2. View active, completed, and expired prescriptions\n3. Each prescription shows medication details, dosage, and instructions\n\n**Choosing a Pharmacy**\nYour provider may suggest a pharmacy, but you can always choose or change your preferred pharmacy:\n1. Click on the prescription\n2. Select "Send to Pharmacy" or "Change Pharmacy"\n3. Browse available pharmacies by location or search\n4. Confirm your selection\n\n**Tracking Fulfillment**\nOnce sent to a pharmacy, you can track the status:\n- Received: Pharmacy has the prescription\n- Preparing: Medication is being prepared\n- Ready for Pickup / Out for Delivery\n\n**Refill Requests**\nFor medications with refills available, you can request a refill directly from your prescription page.',
 'Understand how electronic prescriptions are created, sent to pharmacies, and fulfilled.',
 ARRAY['prescription', 'medication', 'pharmacy', 'refill', 'e-prescription'],
 true, true, 1, 298),

((SELECT id FROM help_categories WHERE slug = 'prescriptions'),
 'Requesting Prescription Refills',
 'requesting-prescription-refills',
 'Need a refill? Here is how to request one through DoktoChain.\n\n**From Your Prescriptions Page**\n1. Navigate to your Prescriptions section\n2. Find the medication you need refilled\n3. Click "Request Refill"\n4. Select your preferred pharmacy\n5. Add any notes for the pharmacist\n\n**Automatic Refill Reminders**\nDoktoChain can notify you when your medication is running low. Enable this in your notification settings.\n\n**When Refills Are Not Available**\nIf your prescription has no remaining refills, you will need to:\n1. Schedule a follow-up with your provider\n2. The provider can issue a new prescription after reviewing your case\n3. This can often be done via a quick virtual consultation',
 'Guide to requesting prescription refills and managing medication renewals.',
 ARRAY['refill', 'prescription', 'medication', 'renewal'],
 false, true, 2, 156),

((SELECT id FROM help_categories WHERE slug = 'billing-insurance'),
 'Understanding Your Bills and Invoices',
 'understanding-bills-invoices',
 'DoktoChain provides transparent billing for all your healthcare services.\n\n**Where to Find Your Bills**\nGo to the Billing section of your dashboard to see all invoices and payment history.\n\n**Invoice Details**\nEach invoice includes:\n- Service description (consultation type, provider name)\n- Date of service\n- Amount charged\n- Insurance coverage (if applicable)\n- Your responsibility (co-pay, deductible)\n- Payment status\n\n**Payment Methods**\nDoktoChain accepts:\n- Credit/Debit cards (Visa, Mastercard, Amex)\n- Direct billing to supported insurance providers\n\n**Insurance Claims**\nIf your provider accepts your insurance:\n1. Add your insurance card to your profile\n2. Select it when booking an appointment\n3. The claim will be submitted after your visit\n4. Track claim status in the Billing section',
 'Learn about billing, invoices, insurance claims, and payment options on DoktoChain.',
 ARRAY['billing', 'invoice', 'payment', 'insurance', 'claims'],
 true, true, 1, 201),

((SELECT id FROM help_categories WHERE slug = 'billing-insurance'),
 'Adding and Managing Insurance Cards',
 'managing-insurance-cards',
 'Keep your insurance information up to date on DoktoChain.\n\n**Adding an Insurance Card**\n1. Go to your Profile page\n2. Navigate to the Insurance section\n3. Click "Add Insurance Card"\n4. Take a photo or upload images of the front and back of your card\n5. Enter the required information:\n   - Insurance provider name\n   - Policy number\n   - Group number\n   - Member ID\n   - Effective dates\n\n**Using Insurance for Appointments**\nWhen booking an appointment:\n1. Your saved insurance cards will appear during checkout\n2. Select the appropriate card\n3. The system will verify coverage with the provider\n\n**Self-Pay Option**\nIf you prefer not to use insurance or do not have coverage:\n1. Select "Self-Pay" during booking\n2. The full consultation fee will be displayed\n3. Payment is collected at the time of booking',
 'How to add, manage, and use insurance cards for appointments and billing.',
 ARRAY['insurance', 'insurance card', 'coverage', 'self-pay'],
 false, true, 2, 145),

((SELECT id FROM help_categories WHERE slug = 'telemedicine'),
 'Getting Ready for a Video Consultation',
 'getting-ready-video-consultation',
 'Prepare for a smooth video consultation experience.\n\n**Technical Requirements**\n- A device with a camera and microphone (computer, tablet, or phone)\n- Stable internet connection (minimum 1 Mbps recommended)\n- A modern web browser (Chrome, Firefox, Safari, or Edge)\n\n**Before Your Appointment**\n1. Test your camera and microphone in your device settings\n2. Find a quiet, well-lit, private space\n3. Have your health card and any relevant documents ready\n4. Log into DoktoChain at least 5 minutes early\n5. Complete any pre-visit questionnaires\n\n**Joining the Consultation**\n1. Go to your Appointments page\n2. Click "Join Video Call" when it becomes active\n3. Allow camera and microphone access when prompted\n4. You will enter a virtual waiting room\n5. The provider will admit you when ready\n\n**After the Consultation**\nYour visit summary, prescriptions, and any follow-up instructions will be available in your dashboard.',
 'Everything you need to know to prepare for and join a video consultation.',
 ARRAY['video', 'telemedicine', 'virtual', 'consultation', 'preparation'],
 false, true, 1, 223),

((SELECT id FROM help_categories WHERE slug = 'telemedicine'),
 'Troubleshooting Video Call Issues',
 'troubleshooting-video-call-issues',
 'Having trouble with your video consultation? Try these solutions.\n\n**Camera Not Working**\n- Check that your browser has permission to access the camera\n- Close other apps that might be using the camera\n- Try refreshing the page\n\n**Microphone Not Working**\n- Check browser permissions for microphone access\n- Ensure your microphone is not muted in your device settings\n- Try using headphones with a built-in microphone\n\n**Poor Video Quality**\n- Close other browser tabs and applications\n- Move closer to your Wi-Fi router\n- Switch from Wi-Fi to a wired connection if possible\n\n**Connection Drops**\n- If disconnected, try refreshing the page and rejoining\n- Switch to a different network if available\n- As a last resort, you can call the provider directly\n\n**Still Having Issues?**\nContact our support team through the Help Center.',
 'Solutions for common video consultation technical issues.',
 ARRAY['troubleshooting', 'video', 'camera', 'microphone', 'connection'],
 false, true, 2, 187),

((SELECT id FROM help_categories WHERE slug = 'account-settings'),
 'Managing Your Profile and Settings',
 'managing-profile-settings',
 'Keep your DoktoChain profile up to date for the best experience.\n\n**Personal Information**\nUpdate your personal details from the Profile page:\n- Full name and date of birth\n- Contact information (phone, email)\n- Address\n- Emergency contacts\n\n**Notification Preferences**\nControl how you receive notifications:\n1. Go to Settings > Notifications\n2. Choose notification types (appointment reminders, prescription updates, messages)\n3. Select delivery methods (email, push notification, SMS)\n\n**Privacy Settings**\nManage your data sharing preferences:\n- Review active consent records\n- Control who can access your health records\n- View your data access audit trail\n\n**Security**\n- Change your password regularly\n- Enable two-factor authentication for added security\n- Review your active sessions',
 'How to update your profile, manage notifications, and configure privacy settings.',
 ARRAY['profile', 'settings', 'notifications', 'privacy', 'security'],
 false, true, 1, 167),

((SELECT id FROM help_categories WHERE slug = 'account-settings'),
 'Data Privacy and Your Rights',
 'data-privacy-your-rights',
 'DoktoChain takes your privacy seriously. Here is what you should know.\n\n**Your Data Rights**\nAs a DoktoChain user, you have the right to:\n- Access all your personal and health data\n- Export your data in standard formats\n- Know who has accessed your records and when\n- Revoke consent for data sharing at any time\n- Request corrections to your records\n\n**Consent-Based Access**\nDoktoChain uses a consent-based data access model:\n- Every data access request requires your explicit consent\n- Consent can be time-limited\n- You can view and manage all active consents from your Privacy settings\n- All access is logged in a tamper-evident audit trail\n\n**Canadian Healthcare Compliance**\nDoktoChain complies with:\n- PIPEDA (Personal Information Protection and Electronic Documents Act)\n- Provincial health information privacy laws\n- FHIR R4 data interoperability standards\n\n**Questions?**\nContact our privacy team through the support section for any data privacy concerns.',
 'Understand your data privacy rights and how DoktoChain protects your information.',
 ARRAY['privacy', 'data', 'consent', 'audit', 'PIPEDA', 'rights'],
 false, true, 2, 198)
ON CONFLICT DO NOTHING;