import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
const client = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30000, refetchOnWindowFocus: false } } });
export function AppProviders({ children }: PropsWithChildren) { return <QueryClientProvider client={client}>{children}</QueryClientProvider>; }
