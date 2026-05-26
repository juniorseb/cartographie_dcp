/**
 * Upload de fichiers via URLs pre-signees Cloudflare R2.
 *
 * Le flux :
 * 1. Demander au backend une URL signee (folder + filename + content_type)
 * 2. PUT le fichier directement sur R2 avec cette URL (le backend ne voit
 *    jamais les bytes)
 * 3. Recuperer la cle R2 retournee pour la passer dans la requete metier
 */
import axios from 'axios';
import apiClient from './client';
import type { ApiResponse } from '@/types/api';

export type R2Folder = 'inscriptions' | 'autorisations' | 'documents' | 'avatars';

export interface PresignedUrl {
  url: string;
  key: string;
  expires_in: number;
}

/** Demande une URL PUT pre-signee au backend. */
export async function requestPresignedUrl(
  folder: R2Folder,
  file: File,
): Promise<PresignedUrl> {
  const res = await apiClient.post<ApiResponse<PresignedUrl>>('/uploads/presigned-url', {
    folder,
    filename: file.name,
    content_type: file.type || 'application/octet-stream',
    size: file.size,
  });
  return res.data.data!;
}

/**
 * Upload complet : demande URL signee, PUT le fichier vers R2, retourne la cle.
 * Utilise une instance axios separee (sans le baseURL/api/JWT du backend) pour
 * eviter d'envoyer le Bearer token sur R2.
 */
export async function uploadToR2(folder: R2Folder, file: File): Promise<{
  key: string;
  filename: string;
  size: number;
  mime_type: string;
}> {
  const presigned = await requestPresignedUrl(folder, file);

  await axios.put(presigned.url, file, {
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    // Le PUT ne renvoie pas de JSON, c'est juste un 200 OK
    transformRequest: [(data) => data],
  });

  return {
    key: presigned.key,
    filename: file.name,
    size: file.size,
    mime_type: file.type || 'application/octet-stream',
  };
}
