/**
 * Simple console logger (replaces VS Code output channel)
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
	private level: LogLevel = 'info';
	private enabled: boolean = true;

	setLevel(level: LogLevel) {
		this.level = level;
	}

	setEnabled(enabled: boolean) {
		this.enabled = enabled;
	}

	private shouldLog(level: LogLevel): boolean {
		if (!this.enabled) return false;
		const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
		return levels.indexOf(level) >= levels.indexOf(this.level);
	}

	private format(level: LogLevel, category: string, message: string, data?: any): string {
		const timestamp = new Date().toISOString().substring(11, 19);
		const prefix = `[${timestamp}] [${level.toUpperCase()}] [${category}]`;
		if (data) {
			return `${prefix} ${message} ${JSON.stringify(data)}`;
		}
		return `${prefix} ${message}`;
	}

	debug(category: string, message: string, data?: any) {
		if (this.shouldLog('debug')) {
			console.log(this.format('debug', category, message, data));
		}
	}

	info(category: string, message: string, data?: any) {
		if (this.shouldLog('info')) {
			console.log(this.format('info', category, message, data));
		}
	}

	warn(category: string, message: string, data?: any) {
		if (this.shouldLog('warn')) {
			console.warn(this.format('warn', category, message, data));
		}
	}

	error(category: string, message: string, data?: any) {
		if (this.shouldLog('error')) {
			console.error(this.format('error', category, message, data));
		}
	}

	section(category: string, message: string) {
		if (this.shouldLog('info')) {
			console.log(`\n${'='.repeat(60)}`);
			console.log(this.format('info', category, message));
			console.log('='.repeat(60));
		}
	}

	time_start(label: string): () => void {
		const start = Date.now();
		return () => {
			const elapsed = Date.now() - start;
			this.debug('Timer', `${label} completed in ${elapsed}ms`);
		};
	}
}

export const logger = new Logger();
