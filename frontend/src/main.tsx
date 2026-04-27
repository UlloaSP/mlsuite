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
				<Toaster
					position="top-center"
					toastOptions={{
						classNames: {
							toast: "rounded-lg border border-neutral-200 bg-white text-neutral-950 shadow-lg",
							title: "text-sm font-medium",
							description: "text-sm text-neutral-600",
							actionButton: "rounded-md bg-neutral-950 px-3 py-2 text-sm font-medium text-white",
							cancelButton: "rounded-md bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-950",
							closeButton: "border-neutral-200 bg-white text-neutral-950",
						},
					}}
				/>
			</Provider>
		</QueryClientProvider>
	</React.StrictMode>,
);
