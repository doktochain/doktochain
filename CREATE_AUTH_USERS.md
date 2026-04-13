# Creating Test Users for DoktoChain

This guide explains two methods for creating test users in your DoktoChain application.

## Method 1: Using the Registration UI (Recommended)

The easiest way to create test users is through the application's registration interface:

1. **Navigate to Registration**: Go to `/auth/register` in your app
2. **Create Each User**: Fill out the registration form with the test user details
3. **Verify Email**: Check the email inbox (or Supabase Auth logs if email confirmation is disabled)
4. **Complete Profile**: After registration, complete the user profile based on their role

### Test User Credentials

Use these email addresses with password: `TestPass123!`

**Patients:**
- john.doe@test.com
- sarah.smith@test.com
- michael.johnson@test.com

**Providers:**
- dr.emily.chen@test.com
- dr.robert.martinez@test.com
- dr.aisha.patel@test.com

**Pharmacies:**
- admin@healthplus-toronto.com
- admin@carefirst-vancouver.com

---

## Method 2: Using SQL Template (Database Records Only)

**IMPORTANT**: This method only creates database records. You still need to create the actual auth users first!

### Step 1: Create Auth Users via Supabase Dashboard

1. Open your Supabase Dashboard
2. Go to **Authentication** > **Users**
3. Click **Add user** > **Create new user**
4. Enter email and password for each test user
5. Disable email confirmation if needed

### Step 2: Run SQL Template

After creating auth users:

1. Open **SQL Editor** in Supabase Dashboard
2. Open the file: `TEST_DATA_TEMPLATE.sql`
3. **IMPORTANT**: Update the script to use actual auth user IDs:

```sql
-- Replace this section for each user:
v_user_id_1 := 'ACTUAL-AUTH-USER-UUID-FROM-STEP-1';

-- Instead of:
v_user_id_1 := gen_random_uuid();
```

4. Run the modified script
5. Check the verification query at the bottom

---

## Method 3: Using Supabase Auth API (Advanced)

You can programmatically create users using the Supabase Admin API:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role key required
)

// Create a test patient
const { data, error } = await supabase.auth.admin.createUser({
  email: 'john.doe@test.com',
  password: 'TestPass123!',
  email_confirm: true,
  user_metadata: {
    first_name: 'John',
    last_name: 'Doe'
  }
})

if (data.user) {
  console.log('User created:', data.user.id)
  // Now run SQL to create associated records
}
```

---

## Quick Setup Script

Here's a Node.js script to create all test users at once:

```javascript
// create-test-users.js
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const testUsers = [
  // Patients
  { email: 'john.doe@test.com', role: 'patient', first_name: 'John', last_name: 'Doe' },
  { email: 'sarah.smith@test.com', role: 'patient', first_name: 'Sarah', last_name: 'Smith' },
  { email: 'michael.johnson@test.com', role: 'patient', first_name: 'Michael', last_name: 'Johnson' },

  // Providers
  { email: 'dr.emily.chen@test.com', role: 'provider', first_name: 'Emily', last_name: 'Chen' },
  { email: 'dr.robert.martinez@test.com', role: 'provider', first_name: 'Robert', last_name: 'Martinez' },
  { email: 'dr.aisha.patel@test.com', role: 'provider', first_name: 'Aisha', last_name: 'Patel' },

  // Pharmacies
  { email: 'admin@healthplus-toronto.com', role: 'pharmacy', first_name: 'HealthPlus', last_name: 'Toronto' },
  { email: 'admin@carefirst-vancouver.com', role: 'pharmacy', first_name: 'CareFirst', last_name: 'Vancouver' }
]

async function createTestUsers() {
  console.log('Creating test users...')

  for (const user of testUsers) {
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: 'TestPass123!',
        email_confirm: true,
        user_metadata: {
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role
        }
      })

      if (error) {
        console.error(`Failed to create ${user.email}:`, error.message)
      } else {
        console.log(`✓ Created ${user.role}: ${user.email} (ID: ${data.user.id})`)
      }
    } catch (err) {
      console.error(`Error creating ${user.email}:`, err)
    }
  }

  console.log('\nDone! Now run TEST_DATA_TEMPLATE.sql to populate additional data.')
}

createTestUsers()
```

**To run:**
```bash
# Install dependencies
npm install @supabase/supabase-js

# Set environment variables
export SUPABASE_URL="your-project-url"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Run script
node create-test-users.js
```

---

## Verification

After creating users, verify in Supabase Dashboard:

1. **Authentication** > **Users** - Check all 8 users exist
2. **SQL Editor** - Run verification query from `TEST_DATA_TEMPLATE.sql`
3. **Table Editor** - Check `user_profiles`, `patients`, `providers`, `pharmacies` tables

---

## Default Test Data Summary

### Patients (3)
| Name | Email | Location | Health Card |
|------|-------|----------|-------------|
| John Doe | john.doe@test.com | Toronto, ON | 1234-567-890 |
| Sarah Smith | sarah.smith@test.com | Vancouver, BC | 2345-678-901 |
| Michael Johnson | michael.johnson@test.com | Calgary, AB | 3456-789-012 |

### Providers (3)
| Name | Specialty | Email | Location | Fee |
|------|-----------|-------|----------|-----|
| Dr. Emily Chen | Family Medicine | dr.emily.chen@test.com | Toronto, ON | $150 |
| Dr. Robert Martinez | Cardiology | dr.robert.martinez@test.com | Vancouver, BC | $250 |
| Dr. Aisha Patel | Pediatrics | dr.aisha.patel@test.com | Calgary, AB | $120 |

### Pharmacies (2)
| Name | Email | Location | Features |
|------|-------|----------|----------|
| HealthPlus Pharmacy | admin@healthplus-toronto.com | Toronto, ON | Delivery, Online Orders |
| CareFirst Pharmacy | admin@carefirst-vancouver.com | Vancouver, BC | 24/7, Delivery |

---

## Troubleshooting

### "Email already registered"
- User already exists in auth.users
- Either use a different email or delete the existing user first

### "Failed to load profile" error
- RLS policies may be blocking access
- Check that user_roles table has correct role assigned
- Verify user_id matches between auth.users and user_profiles

### Missing provider/pharmacy data
- Make sure the auth user was created first
- Verify user_id in the SQL script matches auth user ID
- Check that specialties_master table has data (run migrations)

### "Infinite recursion" error
- This should be fixed now
- If it persists, check RLS policies on patients table
- Run: `SELECT * FROM pg_policies WHERE tablename = 'patients'`

---

## Cleanup

To remove all test data:

```sql
-- Run this in Supabase SQL Editor
DELETE FROM user_profiles WHERE email LIKE '%@test.com';
```

Then manually delete auth users from Authentication > Users panel.
