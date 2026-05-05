import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { RetentionPolicy, RetentionRunResponse } from '../types';

export function useRetentionPolicies() {
  const { config } = useAuth();
  
  return useQuery({
    queryKey: ['retention', 'policies'],
    queryFn: async () => {
      if (!config?.apiUrl || !config?.uiSecret) {
        throw new Error('LogStream not configured');
      }

      const response = await fetch(`${config.apiUrl}/api/retention/policies`, {
        headers: {
          'Authorization': `Bearer ${config.uiSecret}`,
          'Accept': 'application/json'
        }
      });

      if (response.status === 503) {
        throw new Error('SERVICE_UNAVAILABLE');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.policies as RetentionPolicy[];
    },
    enabled: !!config?.apiUrl && !!config?.uiSecret,
    retry: (failureCount, error: any) => {
      if (error.message === 'SERVICE_UNAVAILABLE') return false;
      return failureCount < 3;
    }
  });
}

export function useRetentionPolicy(name: string | null) {
  const { config } = useAuth();
  
  return useQuery({
    queryKey: ['retention', 'policies', name],
    queryFn: async () => {
      if (!config?.apiUrl || !config?.uiSecret || !name) {
        throw new Error('Parameters missing');
      }

      const response = await fetch(`${config.apiUrl}/api/retention/policies/${name}`, {
        headers: {
          'Authorization': `Bearer ${config.uiSecret}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      return await response.json() as RetentionPolicy;
    },
    enabled: !!config?.apiUrl && !!config?.uiSecret && !!name
  });
}

export function useCreatePolicy() {
  const { config } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (policy: Partial<RetentionPolicy>) => {
      if (!config?.apiUrl || !config?.uiSecret) {
        throw new Error('LogStream not configured');
      }

      const response = await fetch(`${config.apiUrl}/api/retention/policies`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.uiSecret}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(policy)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      return await response.json() as RetentionPolicy;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retention', 'policies'] });
    }
  });
}

export function useUpdatePolicy() {
  const { config } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, policy }: { name: string; policy: Partial<RetentionPolicy> }) => {
      if (!config?.apiUrl || !config?.uiSecret) {
        throw new Error('LogStream not configured');
      }

      const response = await fetch(`${config.apiUrl}/api/retention/policies/${name}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${config.uiSecret}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(policy)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      return await response.json() as RetentionPolicy;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retention', 'policies'] });
    }
  });
}

export function useDeletePolicy() {
  const { config } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!config?.apiUrl || !config?.uiSecret) {
        throw new Error('LogStream not configured');
      }

      const response = await fetch(`${config.apiUrl}/api/retention/policies/${name}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${config.uiSecret}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retention', 'policies'] });
    }
  });
}

export function useRunRetention() {
  const { config } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ dry_run, policy }: { dry_run?: boolean; policy?: string }) => {
      if (!config?.apiUrl || !config?.uiSecret) {
        throw new Error('LogStream not configured');
      }

      const response = await fetch(`${config.apiUrl}/api/retention/run`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.uiSecret}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ dry_run, policy })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      return await response.json() as RetentionRunResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retention', 'policies'] });
    }
  });
}
