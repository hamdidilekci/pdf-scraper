# Rate Limiting & Brute Force Protection

## Overview

This application implements comprehensive rate limiting to protect against brute force attacks, especially on authentication endpoints.

## Features

### 1. Login Rate Limiting

**Configuration:**

- **Max Failed Attempts:** 5 attempts
- **Time Window:** 15 minutes
- **Block Duration:** 30 minutes

**How It Works:**

1. User attempts to log in
2. System checks if email is currently blocked
3. If not blocked, authentication proceeds
4. Failed attempts are recorded
5. After 5 failed attempts within 15 minutes:
   - User is blocked for 30 minutes
   - All login attempts return generic error
6. Successful login resets the counter

**Database:**
All attempts are tracked in the `RateLimitAttempt` table with:

- Email identifier
- Success/failure status
- Block status and duration
- Metadata (reason for failure)

### 2. Security Benefits

✅ **Prevents Brute Force:** Limits password guessing attempts
✅ **Prevents Credential Stuffing:** Blocks automated login attempts  
✅ **No Information Leakage:** Generic error messages
✅ **Automatic Cleanup:** Old attempts removed periodically

## Implementation Details

### Rate Limit Service

**File:** `lib/services/rate-limit.service.ts`

Key Methods:

```typescript
// Check if identifier is blocked
await rateLimitService.isBlocked(email)

// Record login attempt
await rateLimitService.recordAttempt(email, success)

// Reset after successful login
await rateLimitService.reset(email)

// Cleanup old records
await rateLimitService.cleanup()
```

### Integration with NextAuth

**File:** `lib/auth.ts`

Rate limiting is integrated into the Credentials provider:

```typescript
async authorize(credentials) {
  // 1. Check if user is blocked
  const isBlocked = await rateLimitService.isBlocked(email)
  if (isBlocked) return null

  // 2. Verify credentials
  const valid = await bcrypt.compare(password, hashedPassword)

  // 3. Record attempt
  await rateLimitService.recordAttempt(email, valid)

  // 4. Reset on success
  if (valid) await rateLimitService.reset(email)
}
```

## Database Schema

```prisma
model RateLimitAttempt {
  id           String    @id @default(cuid())
  key          String    // "login:user@example.com"
  success      Boolean
  blocked      Boolean   @default(false)
  blockedUntil DateTime?
  metadata     Json?
  createdAt    DateTime  @default(now())

  @@index([key, createdAt])
  @@index([createdAt])
}
```

## Cleanup & Maintenance

### Automatic Cleanup

**Endpoint:** `/api/cron/cleanup-rate-limits`

This endpoint should be called periodically to remove old rate limit records.

### Setup with Vercel Cron

Add to `vercel.json`:

```json
{
	"crons": [
		{
			"path": "/api/cron/cleanup-rate-limits",
			"schedule": "0 * * * *"
		}
	]
}
```

### Manual Cleanup

You can also trigger cleanup manually:

```bash
curl -X GET https://your-domain.com/api/cron/cleanup-rate-limits \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Configuration

To customize rate limiting, modify `lib/services/rate-limit.service.ts`:

```typescript
const DEFAULT_CONFIG: RateLimitConfig = {
	maxAttempts: 5, // Adjust max attempts
	windowMs: 15 * 60 * 1000, // Adjust time window
	blockDurationMs: 30 * 60 * 1000 // Adjust block duration
}
```

## Monitoring

### Check Block Status

```typescript
const rateLimitService = new RateLimitService()
const isBlocked = await rateLimitService.isBlocked('user@example.com')
const remaining = await rateLimitService.getRemainingAttempts('user@example.com')
```

### Logs

All rate limit events are logged:

- Failed attempts with reasons
- Blocks triggered
- Successful logins
- Cleanup operations

## Security Best Practices

✅ **Generic Error Messages:** Don't reveal if email exists
✅ **Indexed Queries:** Fast lookups with database indexes
✅ **Automatic Cleanup:** Prevents database bloat
✅ **Configurable:** Easy to adjust thresholds
✅ **Observable:** Comprehensive logging

## Troubleshooting

### User Locked Out

If a legitimate user is locked out:

1. **Wait:** Block expires after 30 minutes
2. **Manual Reset:**
   ```typescript
   await rateLimitService.reset('user@example.com')
   ```

### False Positives

If seeing too many false positives:

- Increase `maxAttempts`
- Increase `windowMs`
- Decrease `blockDurationMs`

### Performance Issues

If rate limit checks are slow:

- Ensure database indexes are present
- Run cleanup more frequently
- Consider Redis for high-traffic scenarios

## Future Enhancements

Potential improvements:

- [ ] IP-based rate limiting
- [ ] CAPTCHA after X failed attempts
- [ ] Email notifications on suspicious activity
- [ ] Admin dashboard for managing blocks
- [ ] Whitelist/blacklist functionality
