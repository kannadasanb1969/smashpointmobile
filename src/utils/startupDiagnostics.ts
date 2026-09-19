export type StartupStage =
  | 'APP_BOOT'
  | 'AUTH_RESTORE_START'
  | 'AUTH_RESTORE_SUCCESS'
  | 'AUTH_RESTORE_FAIL'
  | 'PROFILE_FETCH_START'
  | 'PROFILE_FETCH_SUCCESS'
  | 'PROFILE_FETCH_FAIL'
  | 'ROUTER_READY'
  | 'APP_READY';
export function startupDiagnostic(stage: StartupStage): void {
  if (__DEV__) console.info(`[startup] ${stage}`);
}
export function withStartupTimeout<T>(operation: Promise<T>, timeoutMs = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Startup operation timed out')), timeoutMs);
    operation.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
