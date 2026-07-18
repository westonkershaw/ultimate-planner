/**
 * query-client.ts — single QueryClient module instance shared by the whole
 * app. Import this rather than constructing a new QueryClient elsewhere.
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient();
