"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function usePagedList(fetcher, { filters, pageSize = 20, enabled = true, errorMessage = "Failed to load data" } = {}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [data, setData] = useState({ items: [], pagination: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const latestRequest = useRef(0);

  const filterKey = JSON.stringify(filters ?? {});
  const queryKey = `${debouncedSearch}|${filterKey}`;

  const [pageState, setPageState] = useState({ key: queryKey, page: 1 });
  const page = pageState.key === queryKey ? pageState.page : 1;
  const setPage = (next) => setPageState({ key: queryKey, page: next });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    const requestId = ++latestRequest.current;
    try {
      const result = await fetcher({ page, pageSize, search: debouncedSearch || undefined, ...JSON.parse(filterKey) });
      if (requestId !== latestRequest.current) return;
      setData(result);
      setError(null);
    } catch (err) {
      if (requestId !== latestRequest.current) return;
      setError(err.response?.data?.message || errorMessage);
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  }, [fetcher, page, pageSize, debouncedSearch, filterKey, errorMessage]);

  useEffect(() => {
    const run = () => {
      if (enabled) load();
    };
    run();
  }, [enabled, load]);

  return { items: data.items, pagination: data.pagination, loading, error, search, setSearch, page, setPage, reload: load };
}
