import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { searchWorkspace } from "./api/searchService";

export const useDebouncedValue = (value: string, delayMs = 180) => {
	const [debounced, setDebounced] = useState(value);

	useEffect(() => {
		const timeout = window.setTimeout(() => setDebounced(value), delayMs);
		return () => window.clearTimeout(timeout);
	}, [delayMs, value]);

	return debounced;
};

export const useSearchResults = (query: string) =>
	useQuery({
		queryKey: ["search", query],
		queryFn: () => searchWorkspace(query),
		enabled: query.trim().length >= 2,
		staleTime: 30_000,
	});
