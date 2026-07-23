import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

@Injectable()
export class SupabaseService {
  private readonly client: SupabaseClient;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.get<string>('SUPABASE_URL');
    const key = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    this.bucket = this.configService.get<string>('SUPABASE_SUBMISSIONS_BUCKET') ?? 'submissions';

    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined');
    }

    this.client = createClient(url, key);
  }

  async uploadPdf(
    file: Express.Multer.File,
    pathPrefix: string,
  ): Promise<{ path: string; publicUrl: string }> {
    const sanitizedPrefix = pathPrefix
      .split('/')
      .filter(Boolean)
      .map((segment) => segment.trim())
      .join('/');

    if (!sanitizedPrefix) {
      throw new InternalServerErrorException('Invalid path prefix for file upload');
    }

    const sanitizedFileName = this.sanitizeFileName(file.originalname);
    const path = `${sanitizedPrefix}/${randomUUID()}-${sanitizedFileName}`;

    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(path, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      throw new InternalServerErrorException(`Error uploading file: ${error.message}`);
    }

    const { data } = this.client.storage.from(this.bucket).getPublicUrl(path);

    return { path, publicUrl: data.publicUrl };
  }

  private sanitizeFileName(originalName: string): string {
    const lastDotIndex = originalName.lastIndexOf('.');
    const name = lastDotIndex !== -1 ? originalName.slice(0, lastDotIndex) : originalName;
    const extension = lastDotIndex !== -1 ? originalName.slice(lastDotIndex) : '';

    const cleanName = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // quita acentos
      .replace(/[^a-zA-Z0-9-_]/g, '-') // reemplaza cualquier caracter no permitido
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();

    return `${cleanName || 'file'}${extension.toLowerCase()}`;
  }

  async deleteFile(path: string): Promise<void> {
    const { error } = await this.client.storage.from(this.bucket).remove([path]);
    if (error) {
      throw new InternalServerErrorException(`Error deleting file: ${error.message}`);
    }
  }
}