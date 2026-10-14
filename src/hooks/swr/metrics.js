import useSWR from 'swr';

const useSystemMetrics = (query) => {
  const {
    data, error, mutate, isValidating,
  } = useSWR(query ? `/api/system/metrics?${query}` : null, {
    revalidateOnFocus: false,
  });

  return {
    data,
    mutate,
    isError: error,
    isLoading: !!query && !error && !data,
    isValidating,
  };
};

export default useSystemMetrics;
