import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			// Don't retry on 4xx errors (auth/forbidden/not found) — only retry
			// on network failures and 5xx server errors.
			retry: (failureCount, error) => {
				const status = error?.status ?? error?.response?.status;
				if (status && status >= 400 && status < 500) return false;
				return failureCount < 1;
			},
		},
	},
});
