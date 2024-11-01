type LogLevel = 'info' | 'warn' | 'error';

export const logger = {
  log: (level: LogLevel, message: string, extra?: any) => {
    // In production, you might want to send this to CloudWatch
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(extra && { extra }),
    }));
  }
};