import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import api from "../api/axios";

export interface ServerDataTableConfig {
  endpoint: string;
  queryKey: string[];
  defaultPageSize?: number;
}

export function useServerDataTable({
  endpoint,
  queryKey,
  defaultPageSize = 10,
}: ServerDataTableConfig) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read current state from URL
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || String(defaultPageSize), 10);
  const search = searchParams.get("search") || "";
  const sortBy = searchParams.get("sortBy") || "";
  const sortOrder = searchParams.get("sortOrder") || "asc";

  // Parse custom filters (e.g., filter[course]=BCA)
  const filters: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    const match = key.match(/^filter\[(.*?)\]$/);
    if (match) {
      filters[match[1]] = value;
    }
  });

  // Construct query string
  const buildQueryString = () => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (search) params.set("search", search);
    if (sortBy) {
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);
    }
    Object.entries(filters).forEach(([key, value]) => {
      params.set(`filter[${key}]`, value);
    });
    return params.toString();
  };

  const fetchTableData = async () => {
    const queryString = buildQueryString();
    const response = await api.get(`${endpoint}?${queryString}`);
    return response.data; // Should return { success, data, meta }
  };

  const query = useQuery({
    queryKey: [...queryKey, page, limit, search, sortBy, sortOrder, filters],
    queryFn: fetchTableData,
  });

  // State updaters (automatically sync to URL)
  const setPage = (newPage: number) => {
    searchParams.set("page", String(newPage));
    setSearchParams(searchParams);
  };

  const setLimit = (newLimit: number) => {
    searchParams.set("limit", String(newLimit));
    searchParams.set("page", "1"); // reset to page 1 on limit change
    setSearchParams(searchParams);
  };

  const setSearch = (term: string) => {
    if (term) {
      searchParams.set("search", term);
    } else {
      searchParams.delete("search");
    }
    searchParams.set("page", "1");
    setSearchParams(searchParams);
  };

  const setSort = (field: string, order: "asc" | "desc") => {
    searchParams.set("sortBy", field);
    searchParams.set("sortOrder", order);
    setSearchParams(searchParams);
  };

  const setFilter = (key: string, value: string) => {
    if (value && value !== "all") {
      searchParams.set(`filter[${key}]`, value);
    } else {
      searchParams.delete(`filter[${key}]`);
    }
    searchParams.set("page", "1");
    setSearchParams(searchParams);
  };

  const clearFilters = () => {
    const newParams = new URLSearchParams();
    newParams.set("page", "1");
    newParams.set("limit", String(limit));
    setSearchParams(newParams);
  };

  return {
    ...query,
    tableState: {
      page,
      limit,
      search,
      sortBy,
      sortOrder,
      filters,
    },
    actions: {
      setPage,
      setLimit,
      setSearch,
      setSort,
      setFilter,
      clearFilters,
    },
  };
}
