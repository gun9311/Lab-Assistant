// serviceWorkerRegistration.d.ts

interface Config {
    onUpdate?: (registration: ServiceWorkerRegistration) => void;
    onSuccess?: (registration: ServiceWorkerRegistration) => void;
}
  
export function register(config?: Config): void;
export function unregister(): void;
  