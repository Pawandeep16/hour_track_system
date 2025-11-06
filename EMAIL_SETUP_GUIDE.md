# Production Email Setup Guide

Your Hour Tracking System is now configured to send **real emails** in production! This guide will help you set it up.

## ✅ What's Already Done

1. **Edge Function Deployed**: `send-verification-email` is deployed and ready
2. **Frontend Updated**: All components now call the Edge Function
3. **Email Templates**: Professional HTML email templates with your brand colors
4. **Error Handling**: Proper error messages if email fails

## 🚀 Quick Setup (Choose ONE Option)

### Option 1: Resend (Recommended - Easiest)

Resend is the easiest and most modern email service. It's free for up to 3,000 emails/month.

#### Step 1: Sign up for Resend
1. Go to https://resend.com
2. Sign up for a free account
3. Verify your email

#### Step 2: Get Your API Key
1. Go to https://resend.com/api-keys
2. Click "Create API Key"
3. Name it "Hour Tracker"
4. Copy the API key (starts with `re_`)

#### Step 3: Add Domain (Optional but Recommended)
1. Go to https://resend.com/domains
2. Click "Add Domain"
3. Enter your domain (e.g., `yourdomain.com`)
4. Add the DNS records they provide
5. Wait for verification (usually 5-10 minutes)

If you don't have a domain, you can use Resend's test domain for now:
- From: `onboarding@resend.dev`
- Limit: 100 emails/day for testing

#### Step 4: Configure in Supabase
1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Go to **Project Settings** → **Edge Functions** → **Secrets**
4. Add a new secret:
   - Name: `RESEND_API_KEY`
   - Value: Your Resend API key (e.g., `re_xxxxxxxxxxxxx`)
5. Click "Save"

#### Step 5: Update Email "From" Address
Edit the Edge Function to use your domain:
```typescript
from: "Hour Tracker <noreply@yourdomain.com>"
```

If using test domain:
```typescript
from: "Hour Tracker <onboarding@resend.dev>"
```

**That's it! Your emails will now be sent via Resend.**

---

### Option 2: SendGrid (Alternative)

SendGrid is a popular choice with a free tier (100 emails/day).

#### Step 1: Sign up for SendGrid
1. Go to https://sendgrid.com
2. Sign up for a free account
3. Complete email verification

#### Step 2: Get Your API Key
1. Go to https://app.sendgrid.com/settings/api_keys
2. Click "Create API Key"
3. Choose "Restricted Access"
4. Enable "Mail Send" permissions
5. Copy the API key (starts with `SG.`)

#### Step 3: Verify Sender Email
1. Go to https://app.sendgrid.com/settings/sender_auth
2. Click "Verify Single Sender"
3. Fill in your details:
   - From Name: "Hour Tracker"
   - From Email: your email (e.g., noreply@yourdomain.com)
4. Check your email and verify

#### Step 4: Configure in Supabase
1. Go to your Supabase Dashboard
2. Select your project
3. Go to **Project Settings** → **Edge Functions** → **Secrets**
4. Add a new secret:
   - Name: `SENDGRID_API_KEY`
   - Value: Your SendGrid API key (e.g., `SG.xxxxxxxxxxxxx`)
5. Click "Save"

#### Step 5: Update Email "From" Address
The email address must match the one you verified in SendGrid.

**Done! Your emails will now be sent via SendGrid.**

---

## 📧 Email Template

The system sends beautiful HTML emails with:
- **Your branding**: Gradient purple header
- **Clear formatting**: Large, easy-to-read verification codes
- **Professional design**: Responsive layout
- **Security notice**: Explains code expiration (15 minutes)

### Sample Email Preview:

```
┌─────────────────────────────────────┐
│                                     │
│    📧 Email Verification            │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  Hello, John Doe!                   │
│                                     │
│  Thank you for registering with     │
│  Hour Tracker. To complete your     │
│  registration, please use the       │
│  verification code below:           │
│                                     │
│      ╔════════════════╗             │
│      ║    123456      ║             │
│      ╚════════════════╝             │
│                                     │
│  This code will expire in 15 mins   │
│                                     │
└─────────────────────────────────────┘
```

---

## 🧪 Testing Your Setup

### Test 1: Send a Test Email

1. Run your app locally: `npm run dev`
2. Create a new employee with your real email
3. Try to verify the email
4. Check your inbox (and spam folder!)

### Test 2: Check Edge Function Logs

1. Go to Supabase Dashboard
2. Go to **Edge Functions** → `send-verification-email`
3. Click on "Logs" tab
4. You should see successful email sends

### Test 3: Verify Error Handling

1. Temporarily remove the API key from Supabase secrets
2. Try to send an email
3. You should see a user-friendly error message
4. Re-add the API key

---

## 🔧 Troubleshooting

### Emails Not Sending?

**Check 1: API Key is Set**
```bash
# In Supabase Dashboard → Edge Functions → Secrets
# Make sure RESEND_API_KEY or SENDGRID_API_KEY exists
```

**Check 2: Edge Function Deployed**
```bash
# In Supabase Dashboard → Edge Functions
# You should see "send-verification-email" listed
```

**Check 3: Check Logs**
```bash
# In Edge Function logs, look for errors
# Common issues:
# - Invalid API key
# - Unverified sender email
# - Domain not verified
```

**Check 4: Browser Console**
```javascript
// Open browser DevTools → Console
// Look for errors when sending email
// Should show success or specific error message
```

### Emails Going to Spam?

1. **Verify your domain** (Resend/SendGrid)
2. **Set up SPF/DKIM** records (automatically done if you verify domain)
3. **Use a real "From" address** (not noreply@gmail.com)
4. **Warm up your domain** (start with small volumes)

### Rate Limits?

- **Resend Free**: 3,000 emails/month, 100/day
- **SendGrid Free**: 100 emails/day

Upgrade your plan if you need more.

---

## 🎨 Customizing Email Templates

To customize the email template, edit the Edge Function:

1. Go to your project files
2. Open `supabase/functions/send-verification-email/index.ts`
3. Modify the HTML template:
   - Change colors
   - Add your logo
   - Update text
4. Redeploy: The function will auto-redeploy

---

## 💰 Pricing Comparison

| Service | Free Tier | Paid Plans |
|---------|-----------|------------|
| **Resend** | 3,000/month | $20/mo for 50k |
| **SendGrid** | 100/day | $15/mo for 40k |

Both are excellent choices. Resend is newer and easier to set up.

---

## ✨ Pro Tips

1. **Test with your own email first** before rolling out to all employees
2. **Monitor your email quota** in your provider dashboard
3. **Set up domain authentication** for better deliverability
4. **Keep your API keys secret** - never commit them to git
5. **Check spam folders** during initial testing

---

## 🎉 You're Done!

Once you've completed these steps:
- ✅ Verification emails will be sent automatically
- ✅ Professional, branded emails
- ✅ Secure 15-minute expiration
- ✅ Error handling and user feedback
- ✅ Production-ready setup

## 📝 Next Steps

1. Choose Resend or SendGrid
2. Get your API key
3. Add it to Supabase Edge Function secrets
4. Test with your email
5. You're live! 🚀

---

## 🆘 Need Help?

- **Resend Docs**: https://resend.com/docs
- **SendGrid Docs**: https://docs.sendgrid.com
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions

Your system is ready for production email sending! 📧
