import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getConfig } from '../store/configStore';
import { Client, ClientListResponse, DeleteClientResponse } from '../types';

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const config = getConfig();
  const uiSecret = config?.uiSecret;
  const headers = new Headers(options.headers);
  if (uiSecret) {
    headers.set('Authorization', `Bearer ${uiSecret}`);
  }
  headers.set('Content-Type', 'application/json');

  const response = await fetch(url, { ...options, headers });
  
  if (!response.ok) {
    let errorMessage = 'An error occurred';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch (e) {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export function useClients() {
  const config = getConfig();
  const apiUrl = config?.apiUrl;

  return useQuery<ClientListResponse>({
    queryKey: ['clients'],
    queryFn: () => fetchWithAuth(`${apiUrl}/api/clients`),
    enabled: !!apiUrl,
  });
}

export function useClient(appKey: string) {
  const config = getConfig();
  const apiUrl = config?.apiUrl;

  return useQuery<Client>({
    queryKey: ['clients', appKey],
    queryFn: () => fetchWithAuth(`${apiUrl}/api/clients/${appKey}`),
    enabled: !!apiUrl && !!appKey,
  });
}

export function useCreateClient() {
  const config = getConfig();
  const apiUrl = config?.apiUrl;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; app_key: string }) =>
      fetchWithAuth(`${apiUrl}/api/clients`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useUpdateClient() {
  const config = getConfig();
  const apiUrl = config?.apiUrl;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ appKey, data }: { appKey: string; data: Partial<Pick<Client, 'name' | 'active'>> }) =>
      fetchWithAuth(`${apiUrl}/api/clients/${appKey}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['clients', variables.appKey] });
    },
  });
}

export function useRotateToken() {
  const config = getConfig();
  const apiUrl = config?.apiUrl;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (appKey: string) =>
      fetchWithAuth(`${apiUrl}/api/clients/${appKey}/rotate`, {
        method: 'POST',
      }),
    onSuccess: (_, appKey) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['clients', appKey] });
    },
  });
}

export function useDeleteClient() {
  const config = getConfig();
  const apiUrl = config?.apiUrl;
  const queryClient = useQueryClient();

  return useMutation<DeleteClientResponse, Error, string>({
    mutationFn: (appKey: string) =>
      fetchWithAuth(`${apiUrl}/api/clients/${appKey}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}
