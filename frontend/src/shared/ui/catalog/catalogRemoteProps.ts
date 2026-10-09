type RemoteQuery = {
  hasNextPage: boolean;
  isFetching: boolean;
  error: Error | null;
  isFetchNextPageError: boolean;
  fetchNextPage: () => Promise<unknown>;
  refetch: () => Promise<unknown>;
};
export const catalogRemoteProps = (
  query: RemoteQuery,
  onSearchChange: (search: string) => void,
) => ({
  onSearchChange,
  hasNext: query.hasNextPage,
  loading: query.isFetching,
  onLoadMore: () => query.fetchNextPage(),
  error: Boolean(query.error),
  onRetry: () => void (query.isFetchNextPageError ? query.fetchNextPage() : query.refetch()),
});
