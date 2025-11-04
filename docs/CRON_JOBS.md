# Cron Jobs Configuration

This document describes the scheduled tasks (cron jobs) configured for this application.

## Overview

The application uses Vercel Cron Jobs to run scheduled cleanup tasks automatically. These tasks help maintain database hygiene by removing expired records.

## Configured Cron Jobs

### 1. Rate Limit & OTP Cleanup

**Path:** `/api/cron/cleanup-rate-limits`  
**Schedule:** `0 */6 * * *` (Every 6 hours)  
**Function:** Removes expired rate limit attempts and OTP records

#### What It Cleans:

1. **Rate Limit Attempts:**

   - Removes attempts older than the configured window (default: 15 minutes)
   - Removes unblocked attempts older than 24 hours
   - Keeps active blocks until they expire

2. **OTP Records:**
   - Removes OTPs older than expiry time (default: 15 minutes)
   - Removes used OTPs older than 24 hours
   - Prevents database bloat from expired verification codes

#### Configuration

The cron schedule is defined in `vercel.json`:

```json
{
	"crons": [
		{
			"path": "/api/cron/cleanup-rate-limits",
			"schedule": "0 */6 * * *"
		}
	]
}
```

#### Schedule Format

Vercel uses standard cron syntax:

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday to Saturday)
│ │ │ │ │
│ │ │ │ │
* * * * *
```

**Examples:**

- `0 * * * *` - Every hour at minute 0
- `*/15 * * * *` - Every 15 minutes
- `0 0 * * *` - Daily at midnight (00:00)
- `0 2 * * 0` - Weekly on Sunday at 2:00 AM
- `0 0 1 * *` - Monthly on the 1st at midnight

## Security

### Vercel Cron Authentication

When deployed on Vercel, cron jobs automatically include a special header:

```
x-vercel-cron: 1
```

The API route verifies this header to ensure requests are from Vercel's cron system.

### Manual Trigger (Development/Testing)

For local testing or manual triggers, you can use a `CRON_SECRET`:

1. **Add to `.env.local`:**

   ```bash
   CRON_SECRET=your_secret_key_here
   ```

2. **Add to Vercel Environment Variables:**

   - Go to your Vercel project settings
   - Navigate to "Environment Variables"
   - Add `CRON_SECRET` with a secure random value

3. **Trigger manually:**
   ```bash
   curl -X GET https://your-domain.com/api/cron/cleanup-rate-limits \
     -H "Authorization: Bearer your_secret_key_here"
   ```

## Deployment

### Step 1: Deploy to Vercel

The `vercel.json` file is automatically detected by Vercel during deployment.

```bash
# Deploy to Vercel
vercel deploy

# Or deploy to production
vercel --prod
```

### Step 2: Verify Cron Jobs

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Cron Jobs**
3. You should see your configured cron job listed

### Step 3: Monitor Logs

View cron job execution logs in:

- Vercel Dashboard → **Deployments** → Select deployment → **Functions** tab
- Look for logs from `/api/cron/cleanup-rate-limits`

## Local Testing

To test the cron endpoint locally:

### Option 1: Direct HTTP Request

```bash
# Start your dev server
npm run dev

# In another terminal, trigger the endpoint
curl http://localhost:3000/api/cron/cleanup-rate-limits
```

### Option 2: With Authentication

```bash
# Add CRON_SECRET to .env.local
echo "CRON_SECRET=test_secret_123" >> .env.local

# Restart dev server
npm run dev

# Trigger with auth
curl http://localhost:3000/api/cron/cleanup-rate-limits \
  -H "Authorization: Bearer test_secret_123"
```

### Option 3: Using Browser

Simply visit: http://localhost:3000/api/cron/cleanup-rate-limits

You should see a JSON response:

```json
{
	"success": true,
	"message": "Cleanup completed successfully",
	"timestamp": "2025-11-03T22:00:00.000Z"
}
```

## Monitoring

### Success Indicators

Check your application logs for:

```
[INFO] Cleaned up old rate limit attempts { count: X }
[INFO] Cleaned up expired OTPs { count: Y }
[INFO] Cron cleanup completed successfully
```

## Best Practices

1. **Monitor Regularly:** Check cron logs weekly to ensure tasks run successfully
2. **Adjust Schedule:** If cleanup takes too long, increase the interval
3. **Database Indexes:** Ensure proper indexes exist for cleanup queries (already configured)
4. **Alerting:** Set up Vercel integrations to alert on cron failures
5. **Retention Policy:** Adjust cleanup windows based on your compliance requirements

## Customization

### Change Schedule

Edit `vercel.json` and redeploy:

```json
{
	"crons": [
		{
			"path": "/api/cron/cleanup-rate-limits",
			"schedule": "0 0 * * *" // Daily at midnight
		}
	]
}
```

### Add More Cron Jobs

Add additional entries to the `crons` array:

```json
{
	"crons": [
		{
			"path": "/api/cron/cleanup-rate-limits",
			"schedule": "0 * * * *"
		},
		{
			"path": "/api/cron/another-task",
			"schedule": "0 0 * * 0" // Weekly on Sunday
		}
	]
}
```

## Pricing

Vercel Cron Jobs are included in all plans:

- **Hobby (Free):** Up to 1 cron job
- **Pro:** Up to 2 cron jobs
- **Enterprise:** Unlimited cron jobs

Each cron execution counts toward your function invocation limits.

## Related Documentation

- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)
- [Rate Limiting Documentation](./RATE_LIMITING.md)
- [OTP Service Implementation](../lib/services/otp.service.ts)
- [Rate Limit Service Implementation](../lib/services/rate-limit.service.ts)
