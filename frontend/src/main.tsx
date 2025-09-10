import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Provider } from "jotai";
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { ErrorModalProvider } from "./app/components/ErrorModalProvider";
import { emitErrorFromUnknown } from "./app/utils/error-sink";
import { router } from "./router/routes";

const queryClient = new QueryClient({
	queryCache: new QueryCache({
		onError: (error, _query) => {
			// `error` is whatever your fetcher threw (HttpError in your case)
			emitErrorFromUnknown(error);
		},
	}),
	// Route ALL mutation errors here
	mutationCache: new MutationCache({
		onError: (error, _vars, _ctx, _mutation) => {
			emitErrorFromUnknown(error);
		},
	}),
	defaultOptions: {
		queries: { staleTime: 5 * 60_000, retry: 1 },
	},

});

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<ErrorModalProvider>
			<QueryClientProvider client={queryClient}>
				<Provider>
					<RouterProvider router={router} />
				</Provider>
				<ReactQueryDevtools initialIsOpen={false} />
			</QueryClientProvider>
		</ErrorModalProvider>
	</React.StrictMode>,
);