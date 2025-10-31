import { config } from './config'

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogContext {
	userId?: string
	requestId?: string
	[key: string]: any
}

class Logger {
	private isDevelopment = config.nodeEnv === 'development'

	private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
		const timestamp = new Date().toISOString()
		const contextStr = context ? ` ${JSON.stringify(context)}` : ''
		return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`
	}

	private log(level: LogLevel, message: string, context?: LogContext): void {
		const formatted = this.formatMessage(level, message, context)

		switch (level) {
			case 'error':
				console.error(formatted)
				break
			case 'warn':
				console.warn(formatted)
				break
			case 'debug':
				if (this.isDevelopment) {
					console.log(formatted)
				}
				break
			default:
				console.log(formatted)
		}
	}

	info(message: string, context?: LogContext): void {
		this.log('info', message, context)
	}

	warn(message: string, context?: LogContext): void {
		this.log('warn', message, context)
	}

	error(message: string, error?: Error | unknown, context?: LogContext): void {
		const errorMessage = error instanceof Error ? error.message : String(error)
		const errorStack = error instanceof Error ? error.stack : undefined
		this.log('error', message, {
			...context,
			error: errorMessage,
			stack: errorStack
		})
	}

	debug(message: string, context?: LogContext): void {
		this.log('debug', message, context)
	}
}

export const logger = new Logger()
