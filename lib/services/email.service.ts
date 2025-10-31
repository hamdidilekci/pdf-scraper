import { Resend } from 'resend'
import { config } from '@/lib/config'
import { logger } from '@/lib/logger'
import { OTP } from '@/lib/constants'

const resend = config.email.resendApiKey ? new Resend(config.email.resendApiKey) : null

export class EmailService {
	async sendPasswordResetOTP(email: string, otp: string): Promise<void> {
		if (!resend || !config.email.resendApiKey || !config.email.fromEmail) {
			logger.error('Email service configuration missing', undefined, {
				email,
				hasResendApiKey: !!config.email.resendApiKey,
				hasFromEmail: !!config.email.fromEmail
			})
			throw new Error('Email service is not configured. Please set RESEND_API_KEY and FROM_EMAIL environment variables.')
		}

		const subject = `Password Reset Code - ${config.email.appName}`
		const html = this.getPasswordResetEmailTemplate(otp)

		try {
			const { data, error } = await resend.emails.send({
				from: config.email.fromEmail,
				to: email,
				subject,
				html
			})

			if (error) {
				logger.error('Failed to send password reset email', error, { email })
				throw new Error('We could not send the verification email. Please try again')
			}

			logger.info('Password reset OTP email sent', { email, emailId: data?.id })
		} catch (error) {
			logger.error('Email service error', error, { email })
			// Re-throw with user-friendly message if it's not already an Error with message
			if (error instanceof Error && error.message !== 'We could not send the verification email. Please try again') {
				throw error
			}
			if (error instanceof Error) {
				throw error
			}
			throw new Error('We could not send the verification email. Please try again')
		}
	}

	private getPasswordResetEmailTemplate(otp: string): string {
		return `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Password Reset</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
	<table role="presentation" style="width: 100%; border-collapse: collapse;">
		<tr>
			<td style="padding: 20px 0; text-align: center;">
				<table role="presentation" style="width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
					<tr>
						<td style="padding: 40px 40px 20px; text-align: center;">
							<h1 style="margin: 0; color: #1a1a1a; font-size: 24px; font-weight: 600;">Password Reset Request</h1>
						</td>
					</tr>
					<tr>
						<td style="padding: 0 40px 20px;">
							<p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.5;">You requested to reset your password for your ${config.email.appName} account. Use the code below to verify your identity:</p>
						</td>
					</tr>
					<tr>
						<td style="padding: 0 40px 30px; text-align: center;">
							<div style="display: inline-block; padding: 20px 40px; background-color: #f8f9fa; border-radius: 8px; border: 2px dashed #dee2e6;">
								<p style="margin: 0; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1a1a1a; font-family: 'Courier New', monospace;">${otp}</p>
							</div>
						</td>
					</tr>
					<tr>
						<td style="padding: 0 40px 20px;">
							<p style="margin: 0 0 10px; color: #4a4a4a; font-size: 14px; line-height: 1.5;">This code will expire in <strong>${OTP.EXPIRY_MINUTES} minutes</strong>.</p>
							<p style="margin: 0; color: #6c757d; font-size: 14px; line-height: 1.5;">If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
						</td>
					</tr>
					<tr>
						<td style="padding: 20px 40px; border-top: 1px solid #e9ecef;">
							<p style="margin: 0; color: #6c757d; font-size: 12px; line-height: 1.5; text-align: center;">For security reasons, never share this code with anyone. Our team will never ask for your verification code.</p>
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
</body>
</html>
		`
	}
}
