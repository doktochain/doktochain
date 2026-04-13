# Doktochain AWS Migration Plan

## Compliance-Focused Deployment in Canada

This document provides a complete, step-by-step plan to migrate DoktoChain from Supabase to a fully AWS-native architecture deployed in `ca-central-1` (Montreal). The target architecture satisfies Canadian healthcare privacy requirements (PIPEDA, provincial health information acts) and enables institutional partnerships with clinics, hospitals, and health authorities.

**Every step is written so a junior developer can follow it.** Each task includes the exact commands to run, what the expected output looks like, how to verify success, and what to do if something goes wrong.

---

## Important: Deployment Source Location

This migration plan assumes you are deploying **from your local machine** where you have the complete codebase cloned from your repository.

### If Your Code is Currently on Bolt.new:

Before starting this migration, you MUST:

1. **Download the complete project** from bolt.new to your local machine
2. **Initialize a Git repository** (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit from bolt.new"
   ```
3. **Push to GitHub** (or GitLab/Bitbucket):
   ```bash
   # Create a new repository on GitHub named 'doktochain'
   git remote add origin https://github.com/YOUR_USERNAME/doktochain.git
   git branch -M main
   git push -u origin main
   ```
4. **Clone the repository** to your local development machine:
   ```bash
   git clone https://github.com/YOUR_USERNAME/doktochain.git
   cd doktochain
   npm install
   ```

### Why Local Deployment is Required:

- AWS CDK requires local Node.js environment with AWS CLI configured
- Database migration scripts run from your terminal with direct access to Aurora
- You need to manage AWS credentials locally (using the assume-role pattern described in Task P2)
- The CI/CD pipeline (Phase 9) will automate deployments AFTER the initial setup

**Do NOT attempt to run AWS commands directly from bolt.new.** The bolt.new environment is not designed for AWS infrastructure deployment.

---

## Architecture Overview

```
End Users (Clinics & Patients)
    |
    HTTPS
    |
CloudFront CDN (ca-central-1)
    |
API Gateway (REST + WebSocket)
    |
    +-- Lambda Functions (Node.js 20)
    |       |
    |       +-- Cognito Authorizer (JWT validation)
    |       |
    |       +-- RDS Proxy (connection pooling)
    |               |
    |               Aurora Serverless v2 (PostgreSQL 15)
    |                   - PHI Data
    |                   - Row-Level Security
    |                   - Encrypted at rest (KMS)
    |
    +-- S3 (ca-central-1) -- Encrypted file storage
    |
    +-- CloudTrail + CloudWatch -- Audit & monitoring
    |
    +-- QLDB (optional) -- Immutable audit ledger
    |
Private VPC
    - Private subnets (database, Lambda)
    - Public subnets (NAT Gateway, ALB if needed)
    - Encrypted data in transit (TLS 1.2+)
```

### How This Maps to What We Have Today

| Current (Supabase) | New (AWS) | Why |
|---|---|---|
| Supabase PostgreSQL | Aurora Serverless v2 | Same PostgreSQL engine, but runs in a private VPC you control |
| Supabase Auth | Cognito User Pool | AWS-native auth with HIPAA eligibility |
| Supabase Storage | S3 + presigned URLs | Encrypted, versioned, lifecycle-managed |
| Supabase Realtime | API Gateway WebSocket + Lambda | Same push-based updates, but you own the infra |
| Supabase Edge Functions | Lambda behind API Gateway | Same idea (serverless functions), but AWS-native |
| Supabase Dashboard | CloudWatch + CloudTrail | Monitoring, logging, and audit |

---

## Prerequisites

### Domain Names

Before starting, ensure you have access to:
- **doktochain.ca** (primary domain) -- registered with GoDaddy
- **doktochain.com** (redirect domain) -- registered with GoDaddy

Both domains will be used in Phase 6. The `.com` domain will automatically redirect all traffic to `.ca`.

### AWS Account Setup

Do these tasks in order. Each one depends on the previous.

#### Task P1: Create or Prepare the AWS Account

1. Go to https://aws.amazon.com and sign up (or sign in to an existing account).
2. **Enable MFA on the root account:**
   - Go to IAM in the AWS Console
   - Click "Security credentials" on your root account
   - Under "Multi-factor authentication (MFA)", click "Assign MFA device"
   - Follow the wizard to link an authenticator app
3. **Verify:** You should see a green checkmark next to "MFA" in the IAM Security Status dashboard.

#### Task P2: Create an IAM User and Deployer Role (No Long-Lived Access Keys)

Do NOT use the root account for deployments. Instead of creating permanent access keys, we use the modern AWS pattern: an IAM user authenticates via the console with MFA, then assumes a deployer role to get **temporary credentials** that auto-expire. This gives you an audit trail for every deployment session and eliminates the risk of leaked long-lived keys.

**Step 1: Create the IAM user (console access only, no access keys)**

1. Go to IAM > Users > "Create user"
2. Username: `doktochain-deployer`
3. Check "Provide user access to the AWS Management Console"
4. Set a strong password and require password reset on first login
5. Do **NOT** attach any policies directly — click through and create the user
6. After creation, go to the user's "Security credentials" tab
7. Under "Multi-factor authentication (MFA)", click "Assign MFA device"
8. Follow the wizard to link an authenticator app (e.g., Google Authenticator, Authy)

**Do NOT create access keys.** This user authenticates only via the console and MFA.

**Verify:** Go to IAM > Users and confirm `doktochain-deployer` exists with MFA enabled and **zero access keys**.

**Step 2: Create the deployer IAM role**

1. Go to IAM > Roles > "Create role"
2. Trusted entity type: **AWS account** > **This account**
3. Check "Require MFA"
4. Click "Next" and attach the `AdministratorAccess` policy
5. Role name: `DoktochainDeployerRole`
6. Create the role
7. Open the newly created role and copy its ARN (e.g., `arn:aws:iam::123456789012:role/DoktochainDeployerRole`)
8. Click the "Trust relationships" tab, then "Edit trust policy". Replace the trust policy with this JSON (substitute your account ID):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:user/doktochain-deployer"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "Bool": {
          "aws:MultiFactorAuthPresent": "true"
        }
      }
    }
  ]
}
```

This trust policy ensures that **only** the `doktochain-deployer` user can assume this role, and **only** when MFA is active.

**Verify:** Go to IAM > Roles, open `DoktoChainDeployerRole`, and confirm the trust policy shows the correct user ARN and MFA condition.

**Step 3: Grant the IAM user permission to assume the role**

1. Go to IAM > Users > `doktochain-deployer` > "Permissions" tab
2. Click "Add permissions" > "Create inline policy"
3. Switch to the JSON editor and paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "sts:AssumeRole",
      "Resource": "arn:aws:iam::123456789012:role/DoktochainDeployerRole"
    }
  ]
}
```

4. Name the policy `AllowAssumeDeployerRole` and save

**Verify:** The user's permissions tab shows the inline policy `AllowAssumeDeployerRole`.

**Why this pattern is better than access keys:**
- **Temporary credentials:** Sessions auto-expire (default 1 hour, configurable up to 12 hours) — no permanent secrets to leak
- **MFA enforced:** Every deployment session requires a fresh MFA code
- **Full audit trail:** Every `AssumeRole` call is logged in CloudTrail with the user identity, timestamp, and session duration
- **Easy revocation:** Disable the role or remove the inline policy to instantly cut off all deployment access

#### Task P3: Install and Configure Local Development Tools

Run these commands on your local machine (macOS/Linux). Each command block can be copy-pasted.

**Install AWS CLI v2:**

```bash
# macOS (using Homebrew -- recommended)
brew install awscli

# Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip && sudo ./aws/install
```

**Verify installation:**

```bash
aws --version
```

Expected output: `aws-cli/2.x.x Python/3.x.x ...`

If you see "command not found", the install failed. Retry or check your PATH.

**Create a one-time access key for CLI bootstrapping:**

The IAM user needs a temporary way to call `sts:AssumeRole` from the CLI. Create a **minimal** access key for this purpose only.

1. Go to IAM > Users > `doktochain-deployer` > "Security credentials" tab
2. Click "Create access key" > choose "Command Line Interface (CLI)"
3. Copy the **Access Key ID** and **Secret Access Key**

```bash
aws configure --profile doktochain-user
```

When prompted, enter:
- **AWS Access Key ID:** (the one you just created)
- **AWS Secret Access Key:** (the one you just created)
- **Default region name:** `ca-central-1`
- **Default output format:** `json`

**Configure the assume-role profile:**

Edit `~/.aws/config` and add a profile that automatically assumes the deployer role:

```ini
[profile doktochain]
role_arn = arn:aws:iam::123456789012:role/DoktochainDeployerRole
source_profile = doktochain-user
mfa_serial = arn:aws:iam::123456789012:mfa/doktochain-deployer
region = ca-central-1
output = json
```

Replace `123456789012` with your actual AWS account number.

The `mfa_serial` is the ARN of the MFA device attached to the user. Find it at IAM > Users > `doktochain-deployer` > "Security credentials" > "MFA devices".

**Verify credentials work:**

```bash
aws sts get-caller-identity --profile doktochain-user
```

The CLI will prompt you for your MFA code. Enter the 6-digit code from your authenticator app.

Expected output:
```json
{
    "UserId": "AROA...:botocore-session-...",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:role/DoktochainDeployerRole/botocore-session-..."
}
```

Notice the ARN shows the **role**, not the user. This confirms the assume-role flow is working with temporary credentials.

Write down the **Account** number (12 digits). You will need it below.

If you see "Access Denied", check that: (1) the trust policy on the role includes your user ARN, (2) the inline policy on the user allows `sts:AssumeRole`, and (3) MFA is enabled on the user.

**Install AWS CDK:**

```bash
npm install -g aws-cdk
```

**Verify:**

```bash
cdk --version
```

Expected output: `2.x.x (build xxxxx)`

**Bootstrap CDK in ca-central-1:**

Replace `123456789012` with your actual AWS account number from the step above.

```bash
cdk bootstrap aws://123456789012/ca-central-1 --profile doktochain-user
```

This creates an S3 bucket and IAM roles that CDK needs to deploy stacks. It takes about 60 seconds.

**Verify:** The command should end with `Environment aws://123456789012/ca-central-1 bootstrapped`.

If you see "Access Denied", your IAM user is missing the `AdministratorAccess` policy.

#### Task P4: Set Required Environment Variables

CDK needs to know your AWS account ID. Set it in your terminal:

```bash
export AWS_ACCOUNT_ID=123456789012
```

Replace `123456789012` with your actual account number.

Optionally, set an alert email to receive monitoring alerts:

```bash
export ALERT_EMAIL=team@doktochain.ca
```

### Environment Variables and Secrets Summary

The table below lists everything you will need. **You do NOT set these now.** This is a reference so you can gather the values before you need them.

- **API keys and secrets** are stored in **AWS Secrets Manager** (created in Phase 1, Task 1.5). They are NEVER stored in `.env` files, terminal environment variables, or committed to the repository.
- **Terminal env vars** are temporary values used only during CDK deployment commands on your local machine. They are not persisted anywhere.

| Variable | Where It Goes | When You Need It | How to Get It |
|---|---|---|---|
| `DAILY_API_KEY` | AWS Secrets Manager | Phase 1, Task 1.5 | Daily.co Dashboard > Developers > API Keys |
| `STRIPE_SECRET_KEY` | AWS Secrets Manager | Phase 1, Task 1.5 | Stripe Dashboard > Developers > API Keys (secret key) |
| `STRIPE_PUBLISHABLE_KEY` | AWS Secrets Manager | Phase 1, Task 1.5 | Stripe Dashboard > Developers > API Keys (publishable key) |
| `STRIPE_WEBHOOK_SECRET` | AWS Secrets Manager | Phase 1, Task 1.5 | Stripe Dashboard > Webhooks > Signing secret (see `STRIPE_SETUP.md` Step 6) |
| `AWS_ACCOUNT_ID` | Terminal env var (temporary, for CDK commands only) | Phase 1, Task 1.3 | From `aws sts get-caller-identity` output |
| `ALERT_EMAIL` | Terminal env var (temporary, optional) | Phase 1, Task 1.3 | Your team's email |

**How secrets flow at runtime:** Lambda functions retrieve secrets from AWS Secrets Manager on cold start (not from environment variables). The secret names are passed to Lambda as environment variable references that resolve to Secrets Manager ARNs -- the actual secret values are never exposed in the Lambda configuration.

---

## Phase 1: Infrastructure Deployment

### What This Phase Does

Deploys all the AWS resources (VPC, database, auth, storage, API, CDN, monitoring) using CDK. After this phase, you have an empty but fully configured AWS environment.

### Task 1.1: Install Infrastructure Dependencies

```bash
cd infrastructure
npm install
```

**Verify:** No errors in the output. The `node_modules` folder appears inside `infrastructure/`.

If you see `npm ERR!`, delete `node_modules` and `package-lock.json` inside `infrastructure/` and try again.

### Task 1.2: Preview What CDK Will Create (Dry Run)

Before deploying, see what CDK plans to create:

```bash
cdk diff --all --profile doktochain-user
```

This shows a list of all resources that will be created. Review the output. You should see resources for VPC, Aurora, Cognito, S3, API Gateway, CloudFront, and CloudWatch.

No changes are made to AWS at this point.

### Task 1.3: Deploy All CDK Stacks

Deploy the stacks one at a time in dependency order. This is safer than `--all` because you can catch errors early.

**Important:** The CDK stack names follow the pattern `doktochain-{environment}-{service}`. For production, they are:

```bash
# Step 1: Network (VPC, subnets, security groups) -- ~3 minutes
cdk deploy doktochain-production-network --profile doktochain-user --require-approval broadening

# Step 2: Database (Aurora Serverless v2, RDS Proxy) -- ~15 minutes
cdk deploy doktochain-production-database --profile doktochain-user --require-approval broadening

# Step 3: Auth (Cognito User Pool) -- ~2 minutes
cdk deploy doktochain-production-auth --profile doktochain-user --require-approval broadening

# Step 4: Storage (S3 buckets) -- ~1 minute
cdk deploy doktochain-production-storage --profile doktochain-user --require-approval broadening

# Step 5: API (Lambda functions, API Gateway, WebSocket) -- ~5 minutes
cdk deploy doktochain-production-api --profile doktochain-user --require-approval broadening

# Step 6: CDN (CloudFront distribution) -- ~5 minutes
cdk deploy doktochain-production-cdn --profile doktochain-user --require-approval broadening

# Step 7: Monitoring (CloudTrail, CloudWatch alarms, dashboard) -- ~3 minutes
cdk deploy doktochain-production-monitoring --profile doktochain-user --require-approval broadening
```

Each command will show you what it plans to create and ask `Do you wish to deploy these changes (y/n)?`. Type `y` and press Enter.

**What `--require-approval broadening` means:** CDK will ask for confirmation only when creating IAM permissions or security group changes. This is a safety net so you don't accidentally open up access.

**If a stack fails:** Read the error message. Common causes:
- "Resource already exists" -- a resource with the same name was created by a previous attempt. Delete it in the AWS Console first.
- "Rate exceeded" -- wait 60 seconds and retry the same command.
- "IAM permissions" -- your deployer user needs `AdministratorAccess`.

### Task 1.4: Save the CDK Outputs

After each stack deploys, CDK prints output values. You need to save these. They look like this:

```
Outputs:
doktochain-production-api.ApiGatewayUrl = https://abc123.execute-api.ca-central-1.amazonaws.com/v1/
doktochain-production-api.WebSocketUrl = wss://xyz789.execute-api.ca-central-1.amazonaws.com/v1
doktochain-production-auth.UserPoolId = ca-central-1_AbCdEfGhI
doktochain-production-auth.UserPoolClientId = 1a2b3c4d5e6f7g8h9i0j
doktochain-production-cdn.CloudFrontDomain = d1234567890abc.cloudfront.net
doktochain-production-cdn.DistributionId = E1234567890ABC
doktochain-production-storage.StorageBucketName = doktochain-production-storage
doktochain-production-storage.FrontendBucketName = doktochain-production-frontend
doktochain-production-database.RdsProxyEndpoint = doktochain-production-rds-proxy.proxy-abc123.ca-central-1.rds.amazonaws.com
doktochain-production-database.ClusterEndpoint = doktochain-production-aurora.cluster-abc123.ca-central-1.rds.amazonaws.com
doktochain-production-database.DatabaseSecretArn = arn:aws:secretsmanager:ca-central-1:123456789012:secret:doktochain-production/database-credentials-AbCdEf
```

Create a file called `aws-outputs.txt` in your home directory (NOT in the repo) and paste all outputs there. You will reference these throughout the migration.

**Verify:** Go to the AWS Console, open CloudFormation, and confirm all 7 stacks show status `CREATE_COMPLETE`.

### Task 1.5: Configure Third-Party Secrets

The Lambda functions need API keys for third-party services. These are stored in AWS Secrets Manager -- NEVER in `.env` files, environment variables, or the codebase.

**Important:** The secret names must match exactly what the CDK code expects. The pattern is `doktochain-production/{secret-name}` for production.

#### Complete Third-Party Secrets Inventory

| Secret Name | Service | Where to Get It | Used By |
|-------------|---------|-----------------|---------|
| `doktochain-production/stripe-secret-key` | Stripe | [Stripe Dashboard > Developers > API Keys](https://dashboard.stripe.com/apikeys) | Billing Lambda, subscription checkout, payment processing |
| `doktochain-production/stripe-webhook-secret` | Stripe | Stripe Dashboard > Developers > Webhooks > endpoint signing secret | Stripe webhook Lambda (signature verification) |
| `doktochain-production/stripe-publishable-key` | Stripe | [Stripe Dashboard > Developers > API Keys](https://dashboard.stripe.com/apikeys) | Frontend (passed via SSM to CodeBuild) |
| `doktochain-production/daily-api-key` | Daily.co | [Daily.co Dashboard > Developers > API Keys](https://dashboard.daily.co/developers) | Telemedicine Lambda (video room creation) |
| `doktochain-production/database-credentials` | Aurora | Auto-created by CDK (do not create manually) | All Lambda functions |

#### Important: Test Mode vs Live Mode

For initial setup, use **test mode** keys from Stripe. When ready for production, replace with live keys.

| Mode | Secret Key Prefix | Webhook Secret Prefix | When to Use |
|------|-------------------|----------------------|-------------|
| Test | `sk_test_` | `whsec_` (from test webhook) | Development, staging, QA |
| Live | `sk_live_` | `whsec_` (from live webhook) | Production launch |

Daily.co does not have separate test/live keys. The same key works in both environments.

#### Step-by-Step: Create All Secrets

Run these commands, replacing placeholders with real values. Do NOT include quotes around the secret value unless the value itself contains quotes.

```bash
# 1. Stripe secret key
#    Get from: https://dashboard.stripe.com/apikeys
#    Click "Reveal test key" (for test mode) or "Reveal live key" (for production)
aws secretsmanager create-secret \
  --name "doktochain-production/stripe-secret-key" \
  --secret-string "sk_test_YOUR_ACTUAL_KEY_HERE" \
  --region ca-central-1 \
  --profile doktochain-user

# 2. Stripe webhook secret
#    Get from: Stripe Dashboard > Developers > Webhooks > click your endpoint > Signing secret
#    NOTE: You must create the webhook endpoint first (see STRIPE_SETUP.md Step 6)
#    For AWS, the webhook URL is: https://api.doktochain.ca/v1/webhooks/stripe
aws secretsmanager create-secret \
  --name "doktochain-production/stripe-webhook-secret" \
  --secret-string "whsec_YOUR_ACTUAL_SECRET_HERE" \
  --region ca-central-1 \
  --profile doktochain-user

# 3. Stripe publishable key (for frontend builds via SSM)
#    Get from: https://dashboard.stripe.com/apikeys (the key that starts with pk_)
aws secretsmanager create-secret \
  --name "doktochain-production/stripe-publishable-key" \
  --secret-string "pk_test_YOUR_ACTUAL_KEY_HERE" \
  --region ca-central-1 \
  --profile doktochain-user

# 4. Daily.co API key
#    Get from: https://dashboard.daily.co/developers
aws secretsmanager create-secret \
  --name "doktochain-production/daily-api-key" \
  --secret-string "YOUR_ACTUAL_DAILY_API_KEY_HERE" \
  --region ca-central-1 \
  --profile doktochain-user
```

#### Updating Existing Secrets

If you see `ResourceExistsException`, the secret already exists. Update it instead:

```bash
aws secretsmanager update-secret \
  --secret-id "doktochain-production/stripe-secret-key" \
  --secret-string "NEW_VALUE_HERE" \
  --region ca-central-1 \
  --profile doktochain-user
```

This works for any secret -- just replace the `--secret-id` with the correct name.

#### Switching from Test to Live Keys

When you are ready to go live with payments:

```bash
# Replace test Stripe secret key with live key
aws secretsmanager update-secret \
  --secret-id "doktochain-production/stripe-secret-key" \
  --secret-string "sk_live_YOUR_LIVE_KEY_HERE" \
  --region ca-central-1 \
  --profile doktochain-user

# Replace test publishable key with live key
aws secretsmanager update-secret \
  --secret-id "doktochain-production/stripe-publishable-key" \
  --secret-string "pk_live_YOUR_LIVE_KEY_HERE" \
  --region ca-central-1 \
  --profile doktochain-user

# Create a NEW webhook in Stripe live mode pointing to:
#   https://api.doktochain.ca/v1/webhooks/stripe
# Then update the webhook secret with the new signing secret
aws secretsmanager update-secret \
  --secret-id "doktochain-production/stripe-webhook-secret" \
  --secret-string "whsec_YOUR_LIVE_WEBHOOK_SECRET_HERE" \
  --region ca-central-1 \
  --profile doktochain-user
```

**IMPORTANT:** After updating secrets, Lambda functions pick up the new values on their next cold start. To force an immediate update, redeploy the Lambda functions:

```bash
cd infrastructure
cdk deploy doktochain-production-api --profile doktochain-user --require-approval broadening
```

#### Verify All Secrets Exist

```bash
aws secretsmanager list-secrets --region ca-central-1 --profile doktochain-user \
  --query "SecretList[?contains(Name, 'doktochain-production')].Name" \
  --output table
```

You should see all 5 secrets listed:

```
-------------------------------------------------------
|                    ListSecrets                       |
+-----------------------------------------------------+
|  doktochain-production/database-credentials          |
|  doktochain-production/daily-api-key                 |
|  doktochain-production/stripe-secret-key             |
|  doktochain-production/stripe-webhook-secret         |
|  doktochain-production/stripe-publishable-key        |
+-----------------------------------------------------+
```

#### Supabase Secrets (Current Environment)

While still on Supabase, the same secrets must be stored as Edge Function Secrets in the Supabase dashboard. See `STRIPE_SETUP.md` for detailed instructions.

| Supabase Secret Name | Equivalent AWS Secret | Status |
|---------------------|----------------------|--------|
| `SUPABASE_URL` | N/A (auto-provided) | Already set |
| `SUPABASE_ANON_KEY` | N/A (auto-provided) | Already set |
| `SUPABASE_SERVICE_ROLE_KEY` | N/A (auto-provided) | Already set |
| `SUPABASE_DB_URL` | N/A (auto-provided) | Already set |
| `DAILY_API_KEY` | `doktochain-production/daily-api-key` | Already set |
| `STRIPE_SECRET_KEY` | `doktochain-production/stripe-secret-key` | **Needs to be added** |
| `STRIPE_WEBHOOK_SECRET` | `doktochain-production/stripe-webhook-secret` | **Needs to be added** |

### Done When

- [ ] All 7 CloudFormation stacks show `CREATE_COMPLETE`
- [ ] All CDK output values saved to `aws-outputs.txt`
- [ ] All 4 third-party secrets created in Secrets Manager (database credentials are auto-created by CDK)
- [ ] Stripe webhook endpoint created and tested (see `STRIPE_SETUP.md`)
- [ ] You can see the CloudFront domain in your browser (it will show an S3 error page -- that is expected because we haven't deployed the frontend yet)

---

## Phase 2: Database Migration

### What This Phase Does

Takes the PostgreSQL schema from the Supabase project and applies it to the new Aurora database. After this phase, the database has all tables, functions, RLS policies, and seed data -- but no user data yet.

### Task 2.1: Connect to Aurora

The Aurora database is in a private subnet, so you cannot connect directly from your laptop. You need to use AWS Systems Manager Session Manager to create a tunnel.

**Option A -- SSM Session Manager (recommended, no bastion host needed):**

First, install the Session Manager plugin:

```bash
# macOS
brew install --cask session-manager-plugin

# Linux
curl "https://s3.amazonaws.com/session-manager-downloads/plugin/latest/ubuntu_64bit/session-manager-plugin.deb" -o "session-manager-plugin.deb"
sudo dpkg -i session-manager-plugin.deb
```

Then use port forwarding through RDS Proxy. You will need the RDS Proxy endpoint from your `aws-outputs.txt`.

**Option B -- Bastion host:**

If your organization requires a bastion host, deploy an EC2 instance in the public subnet of the VPC and SSH through it. This is more complex and not covered in detail here.

### Task 2.2: Get Database Credentials

The database password was auto-generated by CDK and stored in Secrets Manager. Retrieve it:

```bash
aws secretsmanager get-secret-value \
  --secret-id "doktochain-production/database-credentials" \
  --region ca-central-1 \
  --profile doktochain-user \
  --query SecretString \
  --output text
```

This outputs a JSON string like:

```json
{"username":"doktochain","password":"auto-generated-password","host":"doktochain-production-aurora.cluster-abc123.ca-central-1.rds.amazonaws.com","port":5432,"dbname":"doktochain"}
```

Save the `username`, `password`, `host`, and `dbname` values. You will use them in the `psql` connection string below.

### Task 2.3: Apply the Auth Compatibility Layer

The existing Supabase RLS policies use `auth.uid()` and `auth.jwt()`. These are Supabase-specific functions. We create identical functions on Aurora that read from PostgreSQL session variables instead.

```bash
# Connect to Aurora (replace values from Task 2.2)
psql "host=<RDS_PROXY_ENDPOINT> port=5432 dbname=doktochain user=doktochain password=<PASSWORD> sslmode=require"

# Once connected, run the auth compatibility SQL
\i infrastructure/sql/auth-compatibility.sql
```

**What this creates:**
- `auth` schema
- `auth.uid()` function -- reads `app.current_user_id` session variable (set by Lambda on every request)
- `auth.jwt()` function -- reads `app.jwt_claims` session variable
- `auth.role()` function -- reads `app.current_role` session variable
- `auth.email()` function -- reads email from JWT claims
- PostgreSQL roles: `authenticated`, `anon`, `service_role`
- Required extensions: `uuid-ossp`, `pgcrypto`

**Verify (while still connected to psql):**

```sql
-- Test that auth.uid() works
BEGIN;
SET LOCAL app.current_user_id = '550e8400-e29b-41d4-a716-446655440000';
SELECT auth.uid();
COMMIT;
-- Expected: 550e8400-e29b-41d4-a716-446655440000

-- Test that auth.jwt() works
BEGIN;
SET LOCAL app.jwt_claims = '{"role":"patient","email":"test@example.com"}';
SELECT auth.jwt()->>'role';
COMMIT;
-- Expected: patient

-- Test auth.role()
BEGIN;
SET LOCAL app.current_role = 'authenticated';
SELECT auth.role();
COMMIT;
-- Expected: authenticated
```

If any of these fail, re-run `\i infrastructure/sql/auth-compatibility.sql` and check for errors.

### Task 2.4: Apply Schema Migrations

The existing 135+ migration files in `supabase/migrations/` are standard PostgreSQL. The migration script applies them to Aurora while skipping Supabase-specific statements.

```bash
# Set environment variables for the script
export DB_HOST=<RDS_PROXY_ENDPOINT>
export DB_NAME=doktochain
export DB_USER=doktochain
export DB_PASSWORD=<PASSWORD_FROM_TASK_2.2>

# Run the migration script
cd infrastructure
chmod +x scripts/migrate-schema.sh
./scripts/migrate-schema.sh
```

**What this script does (step by step):**
1. Connects to Aurora via RDS Proxy
2. Verifies the auth compatibility layer exists
3. Loops through every `.sql` file in `supabase/migrations/` (sorted by filename)
4. For each file, strips out Supabase-specific statements (storage bucket creation, realtime subscriptions)
5. Applies the SQL to Aurora
6. Logs success or failure for each migration
7. At the end, prints a summary: how many succeeded, how many failed

**If a migration fails:** The script logs which file failed and the error message. Common issues:
- "relation already exists" -- the migration was already applied. This is safe to ignore.
- "function does not exist" -- a Supabase-specific function is referenced. The script should filter these out, but if one slips through, you need to manually edit that migration to remove the Supabase-specific line, then re-run.
- "permission denied" -- your database user needs superuser privileges. Run `ALTER USER doktochain WITH SUPERUSER;` as the `postgres` user first.

### Task 2.5: Verify the Database

Connect to Aurora and run these verification queries:

```sql
-- 1. Check table count (expect approximately 100+ tables)
SELECT count(*) as table_count FROM information_schema.tables
WHERE table_schema = 'public';

-- 2. Check RLS is enabled on all public tables
SELECT count(*) as rls_enabled_count
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true;

-- 3. List any tables WITHOUT RLS (these need investigation)
SELECT tablename FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false;

-- 4. Check RLS policies exist
SELECT count(*) as policy_count FROM pg_policies;

-- 5. Verify key tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'user_profiles', 'patients', 'providers', 'pharmacies',
  'appointments', 'prescriptions', 'medical_records',
  'notifications', 'audit_trail'
)
ORDER BY table_name;
-- Expected: all 9 tables listed
```

### Task 2.6: Export and Import Data from Supabase (If You Have Existing Data)

Skip this step if you are starting fresh with no existing users or data.

```bash
# Export data from Supabase (data only, no schema)
pg_dump --data-only --no-owner --no-acl \
  --exclude-table-data='auth.*' \
  --exclude-table-data='storage.*' \
  --exclude-table-data='supabase_*' \
  -h db.YOUR_SUPABASE_PROJECT.supabase.co \
  -U postgres \
  -d postgres \
  > doktochain_data.sql
```

When prompted for the password, enter your Supabase database password (found in Supabase Dashboard > Settings > Database).

```bash
# Import to Aurora
psql "host=<RDS_PROXY_ENDPOINT> port=5432 dbname=doktochain user=doktochain password=<PASSWORD> sslmode=require" \
  < doktochain_data.sql
```

**Verify:** Spot-check a few tables:

```sql
SELECT count(*) FROM user_profiles;
SELECT count(*) FROM appointments;
-- Numbers should match what you see in Supabase
```

### Done When

- [ ] `auth.uid()`, `auth.jwt()`, and `auth.role()` work correctly
- [ ] All migrations applied successfully (check script output)
- [ ] Table count matches expectations
- [ ] RLS is enabled on all public tables
- [ ] Key tables exist and have correct columns
- [ ] Data imported (if applicable) and spot-check counts match

---

## Phase 3: Cognito User Migration

### What This Phase Does

Moves user accounts from Supabase Auth to AWS Cognito. After this phase, users can log in with their email and a new password through Cognito.

### Task 3.1: Understand the Cognito Setup (Already Done by CDK)

The CDK auth stack already created a Cognito User Pool with:
- **Sign-in:** Email + password
- **Custom attributes:** `custom:role` (patient/provider/pharmacy/admin), `custom:tenant_id`
- **Password policy:** 8+ characters, must include uppercase, lowercase, number, and special character
- **MFA:** Optional (TOTP-based)
- **User groups:** patient, provider, pharmacy, admin, clinic
- **Token validity:** Access token 1 hour, refresh token 30 days

You do not need to configure any of this. It is already done.

**Verify:** Go to AWS Console > Cognito > User pools. You should see a pool named `doktochain-production-users`. Click into it and verify the settings above.

### Task 3.2: Choose a User Migration Strategy

Users cannot be migrated with their existing passwords (Supabase uses bcrypt hashing, Cognito uses SRP protocol -- they are incompatible). Pick one of these options:

**Option A -- Bulk Import with Forced Password Reset (Recommended for Launch)**

Best for: Small user base, new product launch, acceptable to email all users.

How it works:
1. Export all users from Supabase
2. Create them in Cognito with temporary passwords
3. Each user receives an email saying "Set your new password"
4. On first login, they enter the temporary password and choose a new one

**Option B -- Lazy Migration (No Forced Reset)**

Best for: Large established user base, seamless UX required.

How it works:
1. Set up a Cognito UserMigration Lambda trigger
2. When a user tries to log in, Cognito calls the Lambda
3. Lambda checks credentials against Supabase Auth
4. If valid, Lambda creates the user in Cognito transparently
5. User is migrated without ever knowing

Downside: Requires keeping Supabase Auth running during the transition period.

### Task 3.3: Execute Option A -- Bulk Import

#### Step 3.3.1: Export Users from Supabase

```bash
psql -h db.YOUR_SUPABASE_PROJECT.supabase.co -U postgres -d postgres \
  -c "COPY (
    SELECT
      au.id,
      au.email,
      au.raw_user_meta_data,
      up.role,
      up.first_name,
      up.last_name,
      up.phone
    FROM auth.users au
    LEFT JOIN public.user_profiles up ON up.user_id = au.id
    WHERE au.deleted_at IS NULL
  ) TO STDOUT WITH CSV HEADER" \
  > users_export.csv
```

**Verify:** Open `users_export.csv` and confirm it has columns: id, email, raw_user_meta_data, role, first_name, last_name, phone. Check the row count matches your expected user count.

#### Step 3.3.2: Run the User Migration Script

```bash
# Set environment variables
export COGNITO_USER_POOL_ID=<UserPoolId from aws-outputs.txt>
export AWS_REGION=ca-central-1
export AWS_PROFILE=doktochain

# Run the migration
node infrastructure/scripts/migrate-users.js
```

**What this script does for each user:**
1. Calls `AdminCreateUser` to create the user in Cognito with a temporary password
2. Sets `custom:role` attribute from the `role` column
3. Sets `given_name` and `family_name` from the CSV
4. Adds the user to the appropriate Cognito group (patient, provider, etc.)
5. Cognito sends the user an email with their temporary password

**If the script fails partway:** It is safe to re-run. Users who are already in Cognito will be skipped (the script checks for `UsernameExistsException`).

#### Step 3.3.3: Sync Users to auth.users Table in Aurora

The RLS policies reference `auth.users` (from Supabase). We need to populate this table with the Cognito user IDs so foreign keys and RLS policies work.

After running the migration script, it outputs a SQL file called `sync_auth_users.sql`. Apply it:

```bash
psql "host=<RDS_PROXY_ENDPOINT> port=5432 dbname=doktochain user=doktochain password=<PASSWORD> sslmode=require" \
  < sync_auth_users.sql
```

**Verify:**

```sql
SELECT count(*) FROM auth.users;
-- Should match the number of users migrated

SELECT au.id, au.email FROM auth.users au
LIMIT 5;
-- Should show real user emails
```

### Task 3.4: Update the Frontend Auth Integration

The frontend needs to use the new Cognito-based auth instead of Supabase Auth.

The following files already exist and are ready to use:

| File | Purpose | Replaces |
|---|---|---|
| `src/lib/auth-client.ts` | Cognito sign-up, sign-in, sign-out, session management | `supabase.auth.*` calls |
| `src/lib/api-client.ts` | HTTP client that attaches Cognito JWT to API requests | `supabase.from().*` calls |
| `src/lib/storage-client.ts` | S3 presigned URL uploads/downloads | `supabase.storage.*` calls |
| `src/lib/websocket-client.ts` | WebSocket client for realtime updates | `supabase.channel().*` calls |

**What you need to do:**

Update `src/contexts/AuthContext.tsx` to use `auth-client.ts` instead of `supabase.auth`. The auth-client exposes the same methods:

| Supabase Method | Auth Client Method |
|---|---|
| `supabase.auth.signUp({email, password})` | `authClient.register(email, password, attributes)` |
| `supabase.auth.signInWithPassword({email, password})` | `authClient.login(email, password)` |
| `supabase.auth.signOut()` | `authClient.logout()` |
| `supabase.auth.getSession()` | `authClient.getSession()` |
| `supabase.auth.onAuthStateChange(cb)` | `authClient.onAuthStateChange(cb)` |

### Done When

- [ ] All users exist in Cognito (check Cognito console > Users)
- [ ] Each user is in the correct group (patient, provider, etc.)
- [ ] `auth.users` table in Aurora is populated
- [ ] A test user can log in with the temporary password and set a new one

---

## Phase 4: Frontend API Migration -- COMPLETED

### Status: All 75 service files have been migrated

All service files now exist in two versions:
- `src/services/` -- Supabase direct (used during Bolt.new development)
- `src/services-aws/` -- API client-based (used for AWS deployment)

The `buildspec-frontend.yml` pre-build step automatically swaps the files:
```bash
cp -v src/services-aws/*.ts src/services/
```

### Architecture: Generic Data Handler

The services-aws files make REST calls in two patterns:

1. **Domain-specific endpoints** (e.g., `/admin/stats`, `/auth/login`, `/providers/:id`) -- handled by dedicated Lambda handlers
2. **Table-level CRUD** (e.g., `/staff-roles`, `/patient-consents`, `/fhir-observations`) -- handled by a **generic data handler** at `/data/`

The `api-client.ts` intelligently routes requests:
- Paths starting with known domain prefixes (auth, admin, providers, etc.) go directly to those handlers
- All other paths are prefixed with `/data/` and routed to the generic CRUD handler

The generic data handler (`infrastructure/lambda/handlers/data/index.ts`):
- Accepts any table from a configurable allowlist (~120 tables)
- Supports GET (with filters, ordering, pagination), POST, PUT, DELETE
- Supports query parameter suffixes: `_gte`, `_lte`, `_ilike`, `_in`
- Enforces RLS via `withRLS()` on every request
- Column names are validated to prevent SQL injection

An RPC handler (`infrastructure/lambda/handlers/rpc/index.ts`) handles server-side function calls like `increment_template_usage`.

### Task 4.1: Configure Frontend Environment Variables

Create or update the `.env` file in the project root with values from `aws-outputs.txt`:

```env
VITE_API_URL=https://api.doktochain.ca
VITE_WS_URL=wss://ws.doktochain.ca
VITE_COGNITO_USER_POOL_ID=ca-central-1_XXXXXXXXX
VITE_COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_STORAGE_BUCKET=doktochain-production-storage
VITE_CLOUDFRONT_DOMAIN=d1234567890.cloudfront.net
```

Replace each value with the actual output from CDK.

**Important:** Until DNS is configured (Phase 6), use the raw AWS URLs instead:
- `VITE_API_URL` = the `ApiGatewayUrl` output (e.g., `https://abc123.execute-api.ca-central-1.amazonaws.com/v1`)
- `VITE_WS_URL` = the `WebSocketUrl` output (e.g., `wss://xyz789.execute-api.ca-central-1.amazonaws.com/v1`)

### Task 4.2: Verify the Migration (Testing Checklist)

All 75 services have been converted. Test each feature area:

| Priority | Service Files | Feature | How to Test |
|---|---|---|---|
| 1 | `authService.ts` | Login/Registration | Can a user register and log in? |
| 2 | `patientService.ts`, `familyManagementService.ts` | Patient profiles | Can a patient view/edit their profile? |
| 3 | `appointmentService.ts`, `enhancedBookingService.ts` | Booking | Can a patient book an appointment? |
| 4 | `providerService.ts`, `providerSearchService.ts` | Provider search | Can a patient find a doctor? |
| 5 | `prescriptionService.ts`, `ePrescriptionService.ts` | Prescriptions | Can a provider write a prescription? |
| 6 | `pharmacyService.ts`, `pharmacyInventoryService.ts` | Pharmacy | Can a pharmacy receive a prescription? |
| 7 | `paymentService.ts`, `subscriptionService.ts` | Payments | Can a patient pay via Stripe? |
| 8 | `dailyRoomService.ts`, `telemedicineService.ts` | Video calls | Can a video consultation start? |
| 9 | `storageService.ts` | File uploads | Can a user upload a document? |
| 10 | `notificationService.ts`, `messagingService.ts` | Notifications | Do notifications appear? |
| 11 | `adminService.ts`, `adminCRUDService.ts` | Admin panel | Can admin manage users? |
| 12 | All remaining services | Everything else | Full regression test |

### Task 4.3: Supabase Storage Calls (7 Files)

These 7 service files intentionally retain `supabase.storage` calls for file uploads:
- `storageService.ts` -- all file operations
- `providerProfileService.ts` -- photo/video/credential uploads
- `providerOnboardingService.ts` -- document uploads
- `patientInsuranceCardService.ts` -- insurance card images
- `clinicalAttachmentService.ts` -- clinical note attachments
- `advancedTelemedicineService.ts` -- session file uploads/downloads
- `enhancedBookingService.ts` -- appointment document uploads

After Phase 5 (Storage Migration), these will be updated to use `storage-client.ts` with S3 presigned URLs.

### Done When

- [x] All 75 service files have AWS versions in `src/services-aws/`
- [x] No `supabase.from()`, `supabase.auth`, or `supabase.rpc()` calls remain (only `supabase.storage`)
- [x] `api-client.ts` routes table-level requests through `/data/` prefix
- [x] Generic data handler registered in API Gateway
- [x] RPC handler registered in API Gateway
- [x] `buildspec-frontend.yml` swaps files during build
- [ ] Each feature works end-to-end in the browser (requires deployed infrastructure)
- [ ] Storage calls migrated to S3 (Phase 5)

---

## Phase 5: Storage Migration

### What This Phase Does

Moves uploaded files (medical records, profile photos, insurance cards, etc.) from Supabase Storage to S3. After this phase, all file operations go through S3 via presigned URLs.

### Task 5.1: Migrate Existing Files from Supabase to S3

```bash
# Set environment variables
export SUPABASE_URL=<your-supabase-url>
export SUPABASE_SERVICE_KEY=<your-supabase-service-role-key>
export S3_BUCKET=doktochain-production-storage
export AWS_REGION=ca-central-1
export AWS_PROFILE=doktochain

# Run the storage migration script
node infrastructure/scripts/migrate-storage.js
```

**What this script does:**
1. Lists all files in every Supabase Storage bucket
2. Downloads each file to a temp directory
3. Uploads to the corresponding S3 prefix (e.g., `medical-records/` bucket becomes `medical-records/` prefix in S3)
4. Verifies the upload checksum matches the download checksum
5. Updates database URLs to point to the new S3 locations
6. Prints a summary of files migrated

**Verify:**

```bash
# Check S3 has files
aws s3 ls s3://doktochain-production-storage/ --recursive --profile doktochain | head -20
```

You should see files organized by prefix (medical-records, profile-photos, etc.).

### Task 5.2: S3 Bucket Structure

After migration, files are organized like this:

```
doktochain-production-storage/
  medical-records/{patient_id}/{timestamp}_{random}.{ext}
  profile-photos/{user_id}/profile.{ext}
  identity-documents/{user_id}/{document_type}_{timestamp}.{ext}
  prescriptions/{prescription_id}/{filename}.{ext}
  insurance-cards/{patient_id}/front_{timestamp}.{ext}
  insurance-cards/{patient_id}/back_{timestamp}.{ext}
  clinic-documents/{clinic_id}/{filename}.{ext}
  cms-media/{content_id}/{filename}.{ext}
```

### Task 5.3: Verify Storage Service Works

After migrating `storageService.ts` (Phase 4, Task 4.3, Priority 9):

1. Log in as a patient
2. Go to Profile > Upload a profile photo
3. Confirm the photo appears
4. Go to Medical Records > Upload a document
5. Confirm you can download it

**If uploads fail:** Check the Lambda logs for the storage function:

```bash
aws logs tail /aws/lambda/doktochain-production-storage \
  --since 10m --profile doktochain --region ca-central-1
```

### Done When

- [ ] All files from Supabase Storage exist in S3
- [ ] Database URLs updated to point to S3
- [ ] File upload works in the browser
- [ ] File download works in the browser
- [ ] Checksums match (script output confirms this)

---

## Phase 6: DNS and CDN Configuration

### What This Phase Does

Points your domains (`doktochain.ca` and `doktochain.com`) to the AWS infrastructure. After this phase, users access the app via your real domain with HTTPS, and `doktochain.com` automatically redirects to `doktochain.ca`.

### Task 6.1: Request SSL Certificates

You need FOUR certificates because CloudFront requires certificates in `us-east-1`, and you need to support both domains:

**Certificate 1 -- for doktochain.ca API Gateway (ca-central-1):**

1. Go to AWS Console > ACM (Certificate Manager) > make sure you're in **ca-central-1**
2. Click "Request a certificate"
3. Choose "Request a public certificate"
4. Domain names: `doktochain.ca` and `*.doktochain.ca`
5. Validation method: DNS validation
6. Click "Request"
7. On the certificate details page, add the CNAME records to GoDaddy for `doktochain.ca`
8. Wait for status to change from "Pending validation" to "Issued" (can take 5-30 minutes)

**Certificate 2 -- for doktochain.ca CloudFront (us-east-1):**

1. **Switch to us-east-1** in the AWS Console
2. Repeat the exact same steps above
3. Same domain names: `doktochain.ca` and `*.doktochain.ca`

**Certificate 3 -- for doktochain.com API Gateway (ca-central-1):**

1. **Switch back to ca-central-1** in the AWS Console
2. Click "Request a certificate"
3. Choose "Request a public certificate"
4. Domain names: `doktochain.com` and `*.doktochain.com`
5. Validation method: DNS validation
6. Click "Request"
7. On the certificate details page, add the CNAME records to GoDaddy for `doktochain.com`
8. Wait for status to change from "Pending validation" to "Issued"

**Certificate 4 -- for doktochain.com CloudFront (us-east-1):**

1. **Switch to us-east-1** in the AWS Console
2. Repeat the exact same steps above
3. Same domain names: `doktochain.com` and `*.doktochain.com`

**Verify:** All four certificates show status "Issued" (two in ca-central-1, two in us-east-1).

### Task 6.2: Migrate Domains from GoDaddy to Route 53 (Recommended)

For easier management, transfer your domains to Route 53 or at least use Route 53 for DNS hosting:

**Option A -- DNS Hosting Only (Easier, Recommended):**

1. Go to Route 53 > Hosted zones > "Create hosted zone"
2. Domain name: `doktochain.ca`
3. Click "Create hosted zone"
4. Note the 4 nameservers (e.g., `ns-123.awsdns-45.com`, etc.)
5. Go to your GoDaddy account > Domains > `doktochain.ca` > Manage DNS
6. Change the nameservers to the 4 Route 53 nameservers
7. Wait 24-48 hours for propagation

Repeat for `doktochain.com`.

**Option B -- Full Domain Transfer (More Complex):**

Follow AWS documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/domain-transfer-to-route-53.html

**For the rest of this guide, we assume you're using Route 53 for DNS hosting (Option A).**

### Task 6.3: Configure Route 53 DNS for doktochain.ca (Primary Domain)

1. Go to Route 53 > Hosted zones > `doktochain.ca`
2. Add these records:

| Name | Type | Value | Purpose |
|---|---|---|---|
| `doktochain.ca` | A (Alias) | CloudFront distribution domain | Main website |
| `www.doktochain.ca` | CNAME | `doktochain.ca` | WWW redirect |
| `api.doktochain.ca` | A (Alias) | API Gateway custom domain | REST API |
| `ws.doktochain.ca` | A (Alias) | WebSocket API Gateway custom domain | WebSocket API |
| `staging.doktochain.ca` | A (Alias) | Staging CloudFront distribution | Staging environment |

### Task 6.4: Configure Route 53 DNS for doktochain.com (Redirect Domain)

1. Go to Route 53 > Hosted zones > `doktochain.com`
2. Add these records to redirect to `doktochain.ca`:

**Method 1 -- CloudFront Redirect (Recommended):**

Create a separate CloudFront distribution specifically for redirecting `doktochain.com` to `doktochain.ca`:

1. Create an S3 bucket named `doktochain-redirect` (can be empty)
2. Enable static website hosting on the bucket with redirect rules:
   - Redirect all requests to: `doktochain.ca`
   - Protocol: `https`
3. Create a CloudFront distribution:
   - Origin: `doktochain-redirect.s3-website-ca-central-1.amazonaws.com`
   - Alternate domain names: `doktochain.com`, `www.doktochain.com`
   - SSL certificate: the us-east-1 certificate for `doktochain.com`
   - Viewer protocol policy: Redirect HTTP to HTTPS
4. In Route 53 hosted zone for `doktochain.com`, add:

| Name | Type | Value |
|---|---|---|
| `doktochain.com` | A (Alias) | Redirect CloudFront distribution |
| `www.doktochain.com` | CNAME | `doktochain.com` |

**Method 2 -- Simple HTTP Redirect (Alternative):**

If you keep DNS at GoDaddy, use GoDaddy's built-in domain forwarding:
1. In GoDaddy, go to `doktochain.com` settings
2. Enable "Forwarding"
3. Forward to: `https://doktochain.ca`
4. Forward type: Permanent (301)
5. Include path: Yes

**Verify:**
```bash
# Test doktochain.com redirects to doktochain.ca
curl -I https://doktochain.com
# Expected: HTTP 301 or 302 with Location: https://doktochain.ca

curl -I https://www.doktochain.com
# Expected: HTTP 301 or 302 with Location: https://doktochain.ca
```

### Task 6.5: Create API Gateway Custom Domains

1. Go to API Gateway > Custom domain names > "Create"
2. Domain name: `api.doktochain.ca`
3. ACM certificate: select the **ca-central-1** certificate for `doktochain.ca`
4. API mapping: map to your REST API, stage `v1`, path (empty)
5. Note the "API Gateway domain name" value (looks like `d-abc123.execute-api.ca-central-1.amazonaws.com`)
6. In Route 53, create the A (Alias) record for `api.doktochain.ca` pointing to this domain name
7. Repeat for `ws.doktochain.ca` with the WebSocket API

### Task 6.6: Attach Certificate to CloudFront

Update the CDK config to include the certificate ARN:

```bash
export ACM_CERTIFICATE_ARN=arn:aws:acm:us-east-1:123456789012:certificate/abc-def-123
```

Then re-deploy the CDN stack:

```bash
cd infrastructure
cdk deploy doktochain-production-cdn --profile doktochain
```

### Task 6.7: Reduce DNS TTL Before Cutover

24 hours before you plan to go live, reduce the TTL on all DNS records to 60 seconds:

1. Go to Route 53 > Hosted zones > `doktochain.ca`
2. Edit each A and CNAME record
3. Change TTL from 300 (5 minutes) to 60 (1 minute)
4. Repeat for `doktochain.com` hosted zone

This allows DNS changes to propagate quickly during cutover. After go-live is stable, increase TTL back to 3600 (1 hour) to reduce DNS query costs.

### Done When

- [ ] All four SSL certificates show "Issued" status
- [ ] `https://doktochain.ca` loads the frontend
- [ ] `https://www.doktochain.ca` loads the frontend
- [ ] `https://doktochain.com` redirects to `https://doktochain.ca`
- [ ] `https://www.doktochain.com` redirects to `https://doktochain.ca`
- [ ] `https://api.doktochain.ca/v1/auth/health` returns a response
- [ ] `wss://ws.doktochain.ca/v1` accepts WebSocket connections
- [ ] No mixed content warnings in the browser
- [ ] DNS propagation checked via https://dnschecker.org for both domains

---

## Phase 7: Testing and Validation

### What This Phase Does

Systematically tests every feature, security control, and compliance requirement before going live. Do NOT skip any of these checks for a healthcare application.

### Task 7.1: Functional Testing

Test each feature as the specified user role. Check the box when it works.

**Patient Features:**
- [ ] Register as a new patient (email + password)
- [ ] Log in / log out
- [ ] Complete profile (name, phone, address, date of birth)
- [ ] Search for a provider by name, specialty, or location
- [ ] View a provider's profile
- [ ] Book an in-person appointment
- [ ] Book a virtual (video) appointment
- [ ] Join a video consultation (Daily.co)
- [ ] View prescriptions
- [ ] Upload insurance card (front + back)
- [ ] Upload medical documents
- [ ] View health records
- [ ] Send a message to a provider
- [ ] Receive a notification
- [ ] Make a payment (Stripe)
- [ ] Manage family members

**Provider Features:**
- [ ] Register as a new provider
- [ ] Complete provider onboarding (license, specialties, schedule)
- [ ] View today's appointments
- [ ] Start a video consultation
- [ ] Write clinical notes (SOAP format)
- [ ] Write a prescription
- [ ] View patient chart (with consent)
- [ ] Manage availability/schedule
- [ ] View earnings and billing

**Pharmacy Features:**
- [ ] Register as a new pharmacy
- [ ] Complete pharmacy onboarding
- [ ] Receive a prescription
- [ ] Fill/dispense a prescription
- [ ] Manage inventory
- [ ] Process an order

**Admin Features:**
- [ ] Log in as admin
- [ ] View dashboard with stats
- [ ] Manage users (list, edit, deactivate)
- [ ] Review provider applications
- [ ] View audit trail
- [ ] Manage platform settings

### Task 7.2: Security Testing

- [ ] **RLS isolation:** Log in as Patient A. Try to access Patient B's records via API. Should get 403 or empty results.
- [ ] **JWT validation:** Send an API request without a token. Should get 401.
- [ ] **JWT validation:** Send an API request with an expired token. Should get 401.
- [ ] **S3 access:** Try to access an S3 file URL directly (without presigned URL). Should get 403.
- [ ] **Database access:** Confirm Aurora is NOT accessible from the public internet (try connecting from your laptop directly -- it should timeout).
- [ ] **Secrets:** Search Lambda logs and API responses for strings that look like API keys or passwords. Should find none.
- [ ] **CORS:** Open browser dev tools on the frontend. No CORS errors should appear.
- [ ] **WAF:** If WAF is configured, test that it blocks SQL injection payloads in request parameters.

### Task 7.3: Compliance Verification

- [ ] **Data residency:** Confirm all AWS resources are in `ca-central-1` (check CloudFormation stacks)
- [ ] **Encryption at rest:** Aurora uses KMS encryption (check RDS console > Configuration > Encryption)
- [ ] **Encryption at rest:** S3 uses server-side encryption (check S3 bucket > Properties > Default encryption)
- [ ] **Encryption in transit:** All connections use TLS 1.2+ (check CloudFront > Security policy: `TLSv1.2_2021`)
- [ ] **Audit logging:** CloudTrail is logging API calls (check CloudTrail > Trails)
- [ ] **Audit trail:** Application audit trail is recording clinical events (check `audit_trail` table)
- [ ] **Consent model:** RLS policies check consent records before cross-boundary data access
- [ ] **Backup:** Aurora has automated backups enabled (check RDS > Maintenance & backups)

### Task 7.4: Performance Testing

- [ ] **API latency:** Make 10 API requests to `/patients/me`. Average response time should be < 500ms.
- [ ] **Cold start:** After 30 minutes of inactivity, make an API request. Cold start should be < 3 seconds.
- [ ] **Database:** Run `SELECT count(*) FROM pg_stat_activity;` to verify connection pooling via RDS Proxy is working (should show < 10 connections even under load).
- [ ] **CDN:** Open browser dev tools > Network tab. Static assets (JS, CSS, images) should have `x-cache: Hit from cloudfront`.
- [ ] **WebSocket:** Open the app, wait 2 minutes. WebSocket should stay connected (no repeated reconnection messages in console).

### Done When

- [ ] All functional test checkboxes are checked
- [ ] All security test checkboxes are checked
- [ ] All compliance verification checkboxes are checked
- [ ] Performance is within acceptable ranges

---

## Phase 8: Go-Live

### What This Phase Does

Switches production traffic from Supabase to AWS. After this phase, the app is live on AWS.

### Task 8.1: Pre-Launch Checklist

Go through this checklist. Every item must be checked before proceeding.

- [ ] All Phase 7 tests pass
- [ ] DNS TTL reduced to 60 seconds (done 24 hours ago)
- [ ] Monitoring dashboard is bookmarked and accessible
- [ ] Alert email is configured and tested (send a test alarm)
- [ ] Stripe webhook URL updated to new API endpoint: `https://api.doktochain.ca/v1/webhooks/stripe`
- [ ] Daily.co webhook URL updated (if applicable)
- [ ] Team is available for the next 4 hours to monitor
- [ ] Rollback plan is understood by at least 2 team members

### Task 8.2: Launch Sequence

Run these steps in order. Do NOT proceed to the next step until the current one is verified.

**Step 1: Deploy the Final Frontend Build**

```bash
# Build the frontend with production env vars
npm run build

# Upload to S3
aws s3 sync dist/ s3://doktochain-production-frontend --delete \
  --profile doktochain --region ca-central-1
```

**Step 2: Invalidate CloudFront Cache**

```bash
aws cloudfront create-invalidation \
  --distribution-id <DistributionId from aws-outputs.txt> \
  --paths "/*" \
  --profile doktochain
```

**Step 3: Update DNS**

If not already done, point `doktochain.ca` to the CloudFront distribution.

**Step 4: Verify All Endpoints**

```bash
# Frontend loads
curl -s -o /dev/null -w "%{http_code}" https://doktochain.ca
# Expected: 200

# API responds
curl -s -o /dev/null -w "%{http_code}" https://api.doktochain.ca/v1/auth/health
# Expected: 200

# WebSocket connects (use wscat or browser)
# Expected: connection established
```

**Step 5: Test Critical User Flows**

1. Register a new test patient
2. Log in
3. Search for a provider
4. Book an appointment
5. Make a test payment (Stripe test mode)
6. Verify the appointment shows up

**Step 6: Monitor for 24 Hours**

Keep the CloudWatch dashboard open. Watch for:
- 5xx error rate (should be < 1%)
- API latency p95 (should be < 1 second)
- Lambda errors (should be near zero)
- Aurora CPU (should be < 50%)

### Task 8.3: Post-Launch

- Increase DNS TTL back to 3600 seconds
- Monitor error rates and latency daily for the first week
- Review CloudTrail logs for unexpected access patterns
- Gather user feedback
- Decommission Supabase after 30 days of stable AWS operation (keep a final database backup first)

### Task 8.4: Rollback Plan

If something is critically broken after launch:

**Frontend rollback:**

```bash
# Re-deploy the previous version from git
git checkout HEAD~1
npm run build
aws s3 sync dist/ s3://doktochain-production-frontend --delete \
  --profile doktochain --region ca-central-1
aws cloudfront create-invalidation \
  --distribution-id <DistributionId> --paths "/*" --profile doktochain
```

**Infrastructure rollback:**

```bash
# Re-deploy CDK from the previous commit
git checkout HEAD~1
cd infrastructure && cdk deploy --all --profile doktochain --context env=production
```

**Database rollback:**

Aurora has automated snapshots. To restore:
1. Go to RDS > Snapshots
2. Select the most recent automated snapshot before the issue
3. Click "Restore snapshot" (this creates a new cluster)
4. Update RDS Proxy to point to the new cluster

---

## Phase 9: CI/CD Pipeline

### What This Phase Does

Sets up automated testing and deployment so every code push is tested and deployed automatically. After this phase, pushing to `staging` auto-deploys to staging, and pushing to `main` deploys to production after manual approval.

### Task 9.1: Understand the Pipeline Architecture

```
GitHub Repository
    |
    push to main / staging
    |
CodePipeline
    |
    +-- Source Stage (CodeStar Connection to GitHub)
    |
    +-- Build Stage (CodeBuild, uses buildspec.yml)
    |       |
    |       +-- npm ci (install dependencies)
    |       +-- npm run typecheck (against original Supabase services)
    |       +-- npm run test (vitest, against original Supabase services)
    |       +-- cp services-aws/*.ts services/ (swap to AWS services)
    |       +-- npm run build (vite build with VITE_* env vars from SSM)
    |       +-- cdk synth (infrastructure)
    |       +-- Output: frontend dist/ artifacts + CDK cloud assembly
    |
    +-- Approval Stage (production pipeline ONLY)
    |       |
    |       +-- SNS notification to team
    |       +-- Manual approval in AWS Console
    |
    +-- Deploy Stage (parallel)
            |
            +-- CDK deploy (infrastructure changes)
            +-- S3 sync + CloudFront invalidation (frontend)
```

### Task 9.2: Create a CodeStar Connection to GitHub

1. Go to AWS Console > Settings (bottom-left) > Connections
2. Click "Create connection"
3. Provider: GitHub
4. Connection name: `doktochain-github`
5. Click "Connect to GitHub" and authorize AWS
6. Click "Install a new app" to install the AWS Connector for GitHub on your repository
7. Complete the connection

**Verify:** Connection status shows "Available".

### Task 9.3: Store Deployment Parameters in SSM Parameter Store

After CDK deployment (Phase 1), store the output values so CodeBuild can use them during builds. Replace each value below with your actual output from `aws-outputs.txt`.

```bash
# Production parameters
aws ssm put-parameter --name /doktochain/production/api-url \
  --value "https://api.doktochain.ca" --type String \
  --region ca-central-1 --profile doktochain

aws ssm put-parameter --name /doktochain/production/ws-url \
  --value "wss://ws.doktochain.ca" --type String \
  --region ca-central-1 --profile doktochain

aws ssm put-parameter --name /doktochain/production/cognito-user-pool-id \
  --value "ca-central-1_XXXXXXXXX" --type String \
  --region ca-central-1 --profile doktochain

aws ssm put-parameter --name /doktochain/production/cognito-client-id \
  --value "XXXXXXXXXXXXXXXXXXXXXXXXXX" --type String \
  --region ca-central-1 --profile doktochain

aws ssm put-parameter --name /doktochain/production/storage-bucket \
  --value "doktochain-production-storage" --type String \
  --region ca-central-1 --profile doktochain

aws ssm put-parameter --name /doktochain/production/cloudfront-domain \
  --value "d1234567890.cloudfront.net" --type String \
  --region ca-central-1 --profile doktochain

aws ssm put-parameter --name /doktochain/production/frontend-bucket \
  --value "doktochain-production-frontend" --type String \
  --region ca-central-1 --profile doktochain

aws ssm put-parameter --name /doktochain/production/cloudfront-distribution-id \
  --value "E1234567890ABC" --type String \
  --region ca-central-1 --profile doktochain

aws ssm put-parameter --name /doktochain/production/auth-provider \
  --value "cognito" --type String \
  --region ca-central-1 --profile doktochain

aws ssm put-parameter --name /doktochain/production/stripe-public-key \
  --value "pk_live_XXXXXXXXXXXXXXXXXXXXXXXXXX" --type String \
  --region ca-central-1 --profile doktochain

aws ssm put-parameter --name /doktochain/production/daily-co-domain \
  --value "doktochain.daily.co" --type String \
  --region ca-central-1 --profile doktochain
```

**For staging:** Repeat all commands above, replacing `production` with `staging` and using staging values. For Stripe, use the test key (`pk_test_...`) in staging.

**Verify:**

```bash
aws ssm get-parameters-by-path --path /doktochain/production/ \
  --region ca-central-1 --profile doktochain \
  --query "Parameters[].Name" --output table
```

You should see all 11 parameters listed.

### Task 9.4: Create CodeBuild Projects

You need 3 CodeBuild projects. For each one:

1. Go to AWS Console > CodeBuild > "Create build project"

**Project 1: `doktochain-build`**
- Source: No source (pipeline provides it)
- Environment:
  - Managed image, Ubuntu, Standard, `aws/codebuild/standard:7.0`
  - Compute: 3 GB memory, 2 vCPUs
  - Environment variables:
    - `DEPLOY_ENV` = `production` (type: Plaintext)
- Buildspec: Use buildspec file (path: `buildspec.yml`)
- Artifacts: No artifacts (pipeline manages them)

**Project 2: `doktochain-deploy-infra`**
- Same environment as above
- Environment variable: `DEPLOY_ENV` = `production`
- Buildspec: path `infrastructure/buildspec-deploy.yml`

**Project 3: `doktochain-deploy-frontend`**
- Same environment as above
- Environment variable: `DEPLOY_ENV` = `production`
- Buildspec: path `buildspec-frontend.yml`

**Important:** Each CodeBuild project's service role needs permissions to:
- Read from SSM Parameter Store (`/doktochain/*`)
- Deploy CloudFormation stacks (for infra project)
- Write to S3 (for frontend project)
- Invalidate CloudFront (for frontend project)
- All CDK-related permissions (for infra project)

The easiest approach: attach `AdministratorAccess` to the CodeBuild role for now, then scope it down later.

### Task 9.5: Create the CodePipeline

1. Go to AWS Console > CodePipeline > "Create pipeline"
2. Pipeline name: `doktochain-production`
3. Service role: "New service role"

**Stage 1 -- Source:**
- Source provider: CodeStarSourceConnection
- Connection: `doktochain-github` (created in Task 9.2)
- Repository: your GitHub repo
- Branch: `main`
- Trigger: "Push" (on code change)

**Stage 2 -- Build:**
- Action: CodeBuild
- Project: `doktochain-build`
- Input: SourceArtifact
- Output: BuildArtifact (with secondary artifacts: `frontend`, `infra`)

**Stage 3 -- Approve:**
- Action: Manual approval
- SNS topic: create a new topic `doktochain-deploy-approval` and subscribe your team email
- Comments: "Review the build output before deploying to production"

**Stage 4 -- Deploy (two parallel actions):**

Action A:
- Name: DeployInfrastructure
- Provider: CodeBuild
- Project: `doktochain-deploy-infra`
- Input: `infra` artifact

Action B:
- Name: DeployFrontend
- Provider: CodeBuild
- Project: `doktochain-deploy-frontend`
- Input: `frontend` artifact

### Task 9.6: Create the Staging Pipeline

Repeat Task 9.5 with these differences:
- Pipeline name: `doktochain-staging`
- Branch: `staging`
- Environment variable `DEPLOY_ENV` = `staging`
- **Remove the Approve stage** (staging deploys automatically)

### Task 9.7: Branch Strategy

| Branch | Pipeline | Environment | Auto-deploy | Approval Required |
|---|---|---|---|---|
| `main` | `doktochain-production` | production | After approval | Yes (manual) |
| `staging` | `doktochain-staging` | staging | Yes | No |
| `feature/*` | None | -- | No (use PR reviews) | -- |

**Workflow for developers:**
1. Create a `feature/my-feature` branch
2. Make changes and push
3. Open a PR to `staging`
4. After PR is merged, staging auto-deploys
5. Test on staging
6. Open a PR from `staging` to `main`
7. After merge, build runs, then team approves in AWS Console
8. Production deploys

### Task 9.8: Set Up Pipeline Failure Alerts

1. Go to Amazon EventBridge > Rules > "Create rule"
2. Name: `doktochain-pipeline-failure`
3. Event pattern:
   ```json
   {
     "source": ["aws.codepipeline"],
     "detail-type": ["CodePipeline Pipeline Execution State Change"],
     "detail": {
       "state": ["FAILED"]
     }
   }
   ```
4. Target: SNS topic `doktochain-production-alerts` (created by the monitoring stack)

Now your team gets an email whenever a pipeline fails.

### Done When

- [ ] Push to `staging` triggers build + automatic deploy
- [ ] Push to `main` triggers build + waits for approval
- [ ] Approving in the console triggers infrastructure + frontend deployment
- [ ] Pipeline failures send email alerts

---

## Resolved Infrastructure Issues

These issues were identified during the infrastructure review and have been fixed:

1. **Cognito-to-auth.users sync** -- RESOLVED. A Cognito post-confirmation Lambda trigger (`post-confirmation/index.ts`) now automatically inserts a row into `auth.users` whenever a new user confirms their account. This is wired via the auth stack.

2. **WebSocket message broadcasting** -- RESOLVED. A shared `websocket.ts` utility uses the API Gateway Management API (`PostToConnectionCommand`) to push messages to connected clients. The messaging handler calls `broadcastToUser()` when a message is sent. Stale connections are automatically cleaned up.

3. **Migration script tracking** -- RESOLVED. The `migrate-schema.sh` script now creates a `schema_migrations` table and checks it before applying each migration. Re-running the script is safe -- already-applied migrations are skipped.

4. **Token refresh race condition** -- RESOLVED. The `api-client.ts` now uses a promise-based mutex. If multiple 401 responses trigger refresh simultaneously, only one refresh request is made and all callers share the result.

5. **UUID validation** -- RESOLVED. `validateUUID()` and `requireUUIDParam()` helpers added to `shared/response.ts` for use in Lambda handlers.

6. **Stripe API version type safety** -- RESOLVED. Removed the `as any` type assertion from the billing Lambda's Stripe client initialization.

---

## Cost Estimate (Monthly)

| Service | What It Does | Estimated Cost |
|---|---|---|
| Aurora Serverless v2 (0.5-4 ACU) | Database | $45-150 |
| RDS Proxy | Connection pooling for Lambda | $22 |
| Lambda (100K requests/mo) | API backend | $1-5 |
| API Gateway (100K requests/mo) | HTTP routing + auth | $3-10 |
| S3 (10GB storage) | File storage | $0.25 |
| CloudFront (50GB transfer) | CDN for frontend | $5-10 |
| Cognito (1K MAU) | User authentication | $0 (free tier) |
| Route 53 (1 hosted zone) | DNS | $0.50 |
| WAF (1 web ACL) | Web application firewall | $6 |
| Secrets Manager (5 secrets) | API keys | $2 |
| CloudWatch (logs + metrics) | Monitoring | $5-15 |
| CloudTrail (1 trail) | Infrastructure audit | $0 (management events free) |
| NAT Gateway | Internet access for private subnets | $35-45 |
| ACM Certificates | SSL/TLS | $0 (free) |
| CodePipeline (2 pipelines) | CI/CD | $2 |
| CodeBuild (100 build-min/mo) | Build server | $1-5 |
| **Total** | | **$128-272/mo** |

**Note:** The biggest cost driver is Aurora Serverless v2 and NAT Gateway. For staging, you can use 0.5 min ACU and 1 NAT Gateway to reduce costs to approximately $80/mo.

---

## File Structure

```
infrastructure/
  package.json                    -- CDK dependencies
  tsconfig.json                   -- TypeScript config for CDK
  cdk.json                        -- CDK app config
  bin/
    app.ts                        -- CDK app entry point (creates all stacks)
  lib/
    config.ts                     -- Environment config (staging vs production)
    network-stack.ts              -- VPC, subnets, security groups, NAT
    database-stack.ts             -- Aurora Serverless v2, RDS Proxy
    auth-stack.ts                 -- Cognito User Pool, groups, client
    storage-stack.ts              -- S3 buckets (storage + frontend)
    api-stack.ts                  -- API Gateway + 17 Lambda functions + WebSocket
    cdn-stack.ts                  -- CloudFront, security headers, SPA routing
    monitoring-stack.ts           -- CloudTrail, CloudWatch alarms + dashboard
  lambda/
    shared/
      db.ts                       -- Database connection pool + RLS session setup
      auth.ts                     -- Cognito JWT extraction + role checking
      response.ts                 -- CORS headers + response helpers
      router.ts                   -- Lambda path router (maps HTTP paths to handlers)
    handlers/
      auth/index.ts               -- Registration, login, password reset
      patients/index.ts           -- Patient CRUD
      providers/index.ts          -- Provider CRUD + search
      appointments/index.ts       -- Appointment lifecycle (book, cancel, reschedule)
      prescriptions/index.ts      -- Prescription management
      pharmacy/index.ts           -- Pharmacy operations
      billing/index.ts            -- Stripe checkout + payment sessions
      telemedicine/index.ts       -- Daily.co room creation
      messaging/index.ts          -- Messages + conversation management
      health-records/index.ts     -- Health records + EHR access
      admin/index.ts              -- Admin operations (users, settings)
      storage/index.ts            -- S3 presigned URL generation
      audit/index.ts              -- Audit trail queries
      clinic/index.ts             -- Clinic management
      stripe-webhook/index.ts     -- Stripe webhook event processing
      websocket/index.ts          -- WebSocket connect/disconnect/message
      ws-authorizer/index.ts      -- WebSocket JWT authorizer
  sql/
    auth-compatibility.sql        -- Supabase auth.uid()/jwt() compatibility for Aurora
  scripts/
    migrate-schema.sh             -- Apply Supabase migrations to Aurora
    migrate-users.js              -- Migrate users from Supabase to Cognito
    migrate-storage.js            -- Migrate files from Supabase Storage to S3
src/
  lib/
    api-client.ts                 -- HTTP client for Lambda API (replaces supabase.from())
    auth-client.ts                -- Cognito auth (replaces supabase.auth)
    storage-client.ts             -- S3 presigned URL uploads (replaces supabase.storage)
    websocket-client.ts           -- WebSocket client (replaces supabase.channel())
```

---

## Compliance Documentation (For Institutional Sales)

When approaching clinic IT departments and privacy officers, prepare:

1. **Data Flow Diagram** -- Shows all PHI paths within the VPC, encrypted channels, and access controls
2. **AWS Compliance Reports** -- SOC 1/2/3, ISO 27001, CSA STAR (available from AWS Artifact)
3. **Encryption Documentation** -- KMS key management, TLS configuration, S3 encryption policies
4. **Access Control Matrix** -- IAM roles, Cognito groups, RLS policies, VPC security groups
5. **Audit Trail Documentation** -- CloudTrail for infrastructure, application audit log for clinical events
6. **Incident Response Plan** -- Detection, containment, notification procedures
7. **Data Retention Policy** -- Retention periods by data type, deletion procedures
8. **Business Associate Agreement** -- AWS BAA (for HIPAA/PHIPA alignment)
9. **Data Processing Agreement** -- Standard AWS DPA for PIPEDA compliance
10. **Penetration Test Results** -- Conduct pen test after deployment, share sanitized results
