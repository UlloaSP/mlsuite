/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "jotai";
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router/dom";
import { Toaster } from "sonner";
import { emitErrorFromUnknown } from "./app/utils/error-sink";
import { router } from "./router/routes";

const queryClient = new QueryClient({
	queryCache: new QueryCache({
		onError: (error, query) => {
			if (query.queryKey[0] === "user") {
				return;
			}
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
		<QueryClientProvider client={queryClient}>
			<Provider>
				<RouterProvider router={router} />
				<Toaster closeButton richColors position="bottom-right" />
			</Provider>
		</QueryClientProvider>
	</React.StrictMode>,
);
