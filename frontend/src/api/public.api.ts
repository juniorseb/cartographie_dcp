import apiClient, { downloadFile } from './client';
import type { ApiResponse, PaginatedData } from '@/types/api';
import type { EntiteListItem, EntitePublicDetail, EntiteFilter } from '@/types/entite';
import type { PublicStats } from '@/types/stats';

interface PaginationParams {
  page?: number;
  per_page?: number;
}

export async function getEntites(
  params: EntiteFilter & PaginationParams = {}
): Promise<PaginatedData<EntiteListItem>> {
  const response = await apiClient.get<ApiResponse<PaginatedData<EntiteListItem>>>(
    '/public/entites',
    { params }
  );
  return response.data.data!;
}

export async function getEntiteDetail(id: string): Promise<EntitePublicDetail> {
  const response = await apiClient.get<ApiResponse<EntitePublicDetail>>(
    `/public/entites/${id}`
  );
  return response.data.data!;
}

export async function getStats(): Promise<PublicStats> {
  const response = await apiClient.get<ApiResponse<PublicStats>>('/public/stats');
  return response.data.data!;
}

export async function exportEntites(
  format: 'excel' | 'csv' | 'pdf',
  filters?: EntiteFilter
): Promise<void> {
  const extensions = { excel: 'xlsx', csv: 'csv', pdf: 'pdf' };
  await downloadFile(
    '/public/export',
    `entites_conformes.${extensions[format]}`,
    { format, ...filters } as Record<string, string>
  );
}
