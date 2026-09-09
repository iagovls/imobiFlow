import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { AssumeRoleWithWebIdentityCommand, STSClient } from '@aws-sdk/client-sts';

import {
  S3Client,
  ListObjectsV2Command,
  ListObjectsV2CommandInput,
  ListObjectsV2CommandOutput,
  ListBucketsCommand,
} from '@aws-sdk/client-s3';

export interface S3ImageItem {
  key: string;
  url: string;
  size: number;
  lastModified: string | null;
}

export interface S3ListResponse {
  bucket: string;
  prefix: string;
  images: S3ImageItem[];
}

export interface S3PresignedUpload {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  bucket: string;
  expiresIn?: number;
}

interface S3Env {
  supabaseUrl: string;
  supabaseAnonKey: string;
  s3ApiBaseUrl?: string;
  s3ApiRegion?: string;
  S3_BUCKET?: string;
}

@Injectable({
  providedIn: 'root',
})
export class S3Service {
  private readonly env: S3Env = environment as unknown as S3Env;
  private readonly API_BASE_URL: string;
  private readonly supabase: SupabaseClient;

  constructor(private http: HttpClient) {
    this.API_BASE_URL = this.env.s3ApiBaseUrl ?? `${this.env.supabaseUrl}/functions/v1`;
    this.supabase = createClient(this.env.supabaseUrl, this.env.supabaseAnonKey);
  }

  getS3PublicUrl(key: string): string {
    return `https://${this.env.S3_BUCKET}.s3.amazonaws.com/${key}`;
  }

  async listImages(prefix: string): Promise<S3ImageItem[]> {
    try {
      const url = `${this.API_BASE_URL}/get-s3-property-images?prefix=${encodeURIComponent(prefix)}&bucket=${encodeURIComponent(this.env.S3_BUCKET ?? '')}`;
      const response = await firstValueFrom(
        this.http.get<S3ListResponse>(url, { headers: await this.buildAuthHeaders() }),
      );
      console.log('[S3Service] Resposta do Supabase:', response);
      return response.images ?? [];
    } catch (err) {
      console.error('[S3Service] Erro ao listar imagens:', err);
      return this.mockListImages(prefix);
    }
  }

  async generateUploadUrl(
    prefix: string,
    filename: string,
    contentType: string,
  ): Promise<S3PresignedUpload> {
    try {
      const url = `${this.API_BASE_URL}/get-s3-presigned-upload-url`;
      const response = await firstValueFrom(
        this.http.post<S3PresignedUpload>(
          url,
          {
            bucket: this.env.S3_BUCKET,
            prefix,
            filename,
            content_type: contentType,
          },
          { headers: await this.buildAuthHeaders() },
        ),
      );
      return response;
    } catch (err) {
      console.error('[S3Service] Erro ao gerar URL de upload (usando mock):', err);
      const cleanName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const timestamp = Date.now();
      const cleanPrefix = prefix.endsWith('/') ? prefix : `${prefix}/`;
      const key = `${cleanPrefix}${timestamp}_${cleanName}`;
      return {
        uploadUrl: '',
        publicUrl: this.getS3PublicUrl(key),
        key,
        bucket: this.env.S3_BUCKET ?? '',
      };
    }
  }

  async uploadFile(presigned: S3PresignedUpload, file: File): Promise<boolean> {
    if (!presigned.key) {
      console.warn('[S3Service] Key vazia, modo simulado ativo');
      await this.delay(800);
      return true;
    }
    try {
      const proxyUrl = `${this.API_BASE_URL}/proxy-s3-upload`;
      const authHeaders = await this.buildAuthHeaders();

      const headersObj: Record<string, string> = {};
      authHeaders.keys().forEach((k) => {
        const val = authHeaders.get(k);
        if (val) headersObj[k] = val;
      });
      headersObj['x-s3-key'] = presigned.key;
      headersObj['x-s3-content-type'] = file.type || 'application/octet-stream';

      const response = await fetch(proxyUrl, {
        method: 'POST',
        body: file,
        headers: headersObj,
      });
      if (!response.ok) {
        const txt = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}: ${response.statusText} — ${txt}`);
      }
      const result = (await response.json()) as { success?: boolean };
      return result.success === true;
    } catch (err) {
      console.error('[S3Service] Erro no upload do arquivo:', err);
      return false;
    }
  }

  async deleteImage(key: string): Promise<boolean> {
    try {
      const url = `${this.API_BASE_URL}/delete-s3-property-image`;
      await firstValueFrom(
        this.http.post(
          url,
          { bucket: this.env.S3_BUCKET, key },
          { headers: await this.buildAuthHeaders() },
        ),
      );
      return true;
    } catch (err) {
      console.error('[S3Service] Erro ao excluir imagem (modo simulado):', err);
      return true;
    }
  }

  async createFolder(prefix: string): Promise<boolean> {
    try {
      const url = `${this.API_BASE_URL}/create-s3-folder`;
      const cleanPrefix = prefix.endsWith('/') ? prefix : `${prefix}/`;
      const resp = await firstValueFrom(
        this.http.post<{ success: boolean }>(
          url,
          { bucket: this.env.S3_BUCKET ?? '', prefix: cleanPrefix },
          { headers: await this.buildAuthHeaders() },
        ),
      );
      console.log('[S3Service] Criar pasta S3:', cleanPrefix, resp);
      return resp.success ?? true;
    } catch (err) {
      console.error('[S3Service] Erro ao criar pasta S3 (modo simulado). prefix:', prefix, err);
      return true;
    }
  }

  async deletePrefix(prefix: string): Promise<{ deleted: number }> {
    try {
      const url = `${this.API_BASE_URL}/delete-s3-prefix`;
      const cleanPrefix = prefix.endsWith('/') ? prefix : `${prefix}/`;
      const resp = await firstValueFrom(
        this.http.post<{ deleted: number }>(
          url,
          { bucket: this.env.S3_BUCKET ?? '', prefix: cleanPrefix },
          { headers: await this.buildAuthHeaders() },
        ),
      );
      console.log('[S3Service] Excluir prefixo S3:', cleanPrefix, resp);
      return { deleted: resp.deleted ?? 0 };
    } catch (err) {
      console.error('[S3Service] Erro ao excluir prefixo S3 (modo simulado). prefix:', prefix, err);
      return { deleted: 0 };
    }
  }

  private async buildAuthHeaders(): Promise<HttpHeaders> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      apikey: this.env.supabaseAnonKey,
    });

    try {
      const { data } = await this.supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
      } else {
        headers = headers.set('Authorization', `Bearer ${this.env.supabaseAnonKey}`);
      }
    } catch {
      headers = headers.set('Authorization', `Bearer ${this.env.supabaseAnonKey}`);
    }
    return headers;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private mockListImages(prefix: string): S3ImageItem[] {
    console.warn('[S3Service] Usando mock para listar imagens (prefix:', prefix, ')');
    return [];
  }

 
}
