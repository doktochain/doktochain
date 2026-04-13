# Daily.co Integration Guide for DoktoChain

This guide explains how to integrate your Daily.co account with DoktoChain for video consultations.

---

## Step 1: Create Daily.co Account

1. Go to [https://dashboard.daily.co/signup](https://dashboard.daily.co/signup)
2. Create a free account (free tier includes):
   - Up to 10 participants per room
   - Unlimited rooms
   - 10,000 participant minutes per month
3. Verify your email address

---

## Step 2: Get Your API Key

1. Log in to [https://dashboard.daily.co](https://dashboard.daily.co)
2. Navigate to **Developers** → **API Keys**
3. Copy your **API Key** (starts with a long alphanumeric string)

**Important**: Keep this API key secure and never expose it in client-side code.

---

## Step 3: Configure Supabase Edge Function Secret

Since we're using Supabase Edge Functions to handle Daily.co API calls securely, you need to add your API key as a secret:

### Option A: Via Supabase Dashboard (Recommended)

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Edge Functions** → **Secrets**
4. Add a new secret:
   - **Name**: `DAILY_API_KEY`
   - **Value**: Your Daily.co API key
5. Click **Save**

### Option B: Via Supabase CLI (For Local Development)

```bash
# Set the secret for production
supabase secrets set DAILY_API_KEY=your_daily_api_key_here

# For local development, create a .env file in supabase/functions/
echo "DAILY_API_KEY=your_daily_api_key_here" > supabase/functions/.env
```

---

## Step 4: Frontend Environment Variables (Optional)

If you want to use Daily.co's client-side features directly, add to your `.env`:

```bash
# Daily.co Configuration (Optional - for client-side SDK)
VITE_DAILY_DOMAIN=your-domain.daily.co
```

**Note**: The main integration uses server-side room creation via Edge Functions, so this is optional.

---

## Step 5: How It Works

### Architecture Overview

```
Patient/Provider → Frontend → Edge Function → Daily.co API → Room Created
                     ↓
              Room URL stored in appointment
                     ↓
              Video consultation starts
```

### Room Creation Flow

1. **Patient or Provider initiates video call**
2. **Frontend calls Edge Function** (`create-daily-room`)
3. **Edge Function creates room** using Daily.co API with:
   - Private room (not publicly listed)
   - 2 participants max (patient + provider)
   - 2-hour expiration
   - Screen sharing enabled
   - Chat enabled
   - Cloud recording enabled
4. **Room URL returned** and stored in appointment
5. **Both parties join** using the room URL

---

## Step 6: Using the Integration

### Creating a Video Room

```typescript
import { dailyRoomService } from './services/dailyRoomService';

// Create a room for an appointment
const result = await dailyRoomService.createRoom(
  appointmentId,
  patientId,
  providerId
);

if (result.success) {
  // Store room URL in appointment
  await dailyRoomService.updateAppointmentWithRoom(
    appointmentId,
    result.roomUrl!,
    result.roomName!
  );

  // Redirect to video consultation
  window.location.href = `/video-call/${appointmentId}`;
}
```

### Joining a Video Room

```typescript
import DailyIframe from '@daily-co/daily-js';

// Get the room URL from appointment
const appointment = await getAppointment(appointmentId);
const roomUrl = appointment.video_room_url;

// Create Daily.co iframe
const callFrame = DailyIframe.createFrame({
  showLeaveButton: true,
  iframeStyle: {
    width: '100%',
    height: '100%',
    border: '0',
  },
});

// Join the call
await callFrame.join({ url: roomUrl });
```

---

## Step 7: Testing the Integration

### Test Room Creation

1. Log in as a provider
2. Go to **Appointments** → Select an appointment
3. Click **Start Video Consultation**
4. Room should be created and you should see the Daily.co interface

### Verify in Daily.co Dashboard

1. Go to [https://dashboard.daily.co/rooms](https://dashboard.daily.co/rooms)
2. You should see rooms named `doktochain-{appointmentId}-{timestamp}`
3. Check room settings match configuration

---

## Step 8: Room Configuration

The Edge Function creates rooms with these settings:

```typescript
{
  privacy: "private",           // Not publicly listed
  max_participants: 2,          // Patient + Provider only
  exp: 2 hours from creation,   // Auto-expire after 2 hours
  enable_chat: true,            // In-call chat
  enable_screenshare: true,     // Screen sharing
  enable_recording: "cloud",    // Cloud recording
}
```

To customize these settings, edit `supabase/functions/create-daily-room/index.ts`.

---

## Step 9: Advanced Features

### Enable Cloud Recording

Recordings are automatically enabled. To access recordings:

1. Go to [https://dashboard.daily.co/recordings](https://dashboard.daily.co/recordings)
2. Recordings are stored for 7 days (free tier)
3. Download or share recordings as needed

### Webhook Integration (Optional)

Set up webhooks to receive events:

1. In Daily.co Dashboard → **Developers** → **Webhooks**
2. Add webhook URL: `https://your-project.supabase.co/functions/v1/daily-webhook`
3. Select events to receive (recording-ready, participant-left, etc.)

---

## Step 10: Billing & Limits

### Free Tier Includes:
- 10,000 participant minutes/month
- Unlimited rooms
- Up to 10 participants per room
- 7-day recording retention

### Upgrading:
If you exceed limits, Daily.co will email you. To upgrade:
1. Go to [https://dashboard.daily.co/billing](https://dashboard.daily.co/billing)
2. Select a paid plan
3. Plans start at $9/month for 50,000 participant minutes

---

## Troubleshooting

### "Failed to create video room"
- Check that `DAILY_API_KEY` secret is set in Supabase
- Verify API key is valid in Daily.co dashboard
- Check Edge Function logs in Supabase Dashboard

### "Room not found"
- Rooms expire after 2 hours
- Check appointment has `video_room_url` stored
- Verify room still exists in Daily.co dashboard

### Camera/Microphone not working
- Ensure browser has permission to access devices
- Check HTTPS is enabled (required for WebRTC)
- Try different browser (Chrome/Firefox recommended)

### Poor video quality
- Check network connection quality
- Daily.co automatically adjusts quality based on bandwidth
- Recommend 2 Mbps minimum for video calls

---

## Security Best Practices

1. **Never expose API key in frontend code** ✅ (Using Edge Functions)
2. **Use private rooms** ✅ (Configured by default)
3. **Set room expiration** ✅ (2-hour expiration)
4. **Limit participants** ✅ (Max 2 participants)
5. **Authenticate users** ✅ (JWT verification on Edge Function)
6. **Log all sessions** (Implement appointment logging)

---

## Support

- **Daily.co Documentation**: [https://docs.daily.co](https://docs.daily.co)
- **Daily.co Support**: [https://help.daily.co](https://help.daily.co)
- **Supabase Edge Functions**: [https://supabase.com/docs/guides/functions](https://supabase.com/docs/guides/functions)

---

## Summary

You now have:
- ✅ Edge Function deployed for secure room creation
- ✅ Service for calling the Edge Function
- ✅ Proper security with server-side API key storage
- ✅ Room configuration optimized for healthcare consultations
- ✅ 2-hour session limits and auto-expiration
- ✅ Cloud recording enabled
- ✅ Audit trail integration ready

**Next Steps:**
1. Add your Daily.co API key as a Supabase secret
2. Test room creation from the appointment page
3. Customize room settings if needed
4. Set up webhooks for recording notifications (optional)
