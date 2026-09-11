import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

export interface Meta {
  id: number;
  corretor_id: string;
  mes: number;
  ano: number;
  meta_valor: number;
  meta_negociacoes: number;
  created_at: string;
  updated_at: string;
}

export type MetaUpsert = Pick<Meta, 'mes' | 'ano' | 'meta_valor' | 'meta_negociacoes'>;

@Injectable({
  providedIn: 'root',
})
export class MetasService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
  }

  private withSchema() {
    return (this.supabase as unknown as { schema: (s: string) => SupabaseClient }).schema('pierre');
  }

  async getMetaAtual(): Promise<Meta | null> {
    const agora = new Date();
    return this.getMetaDoMes(agora.getMonth() + 1, agora.getFullYear());
  }

  async getMetaDoMes(mes: number, ano: number): Promise<Meta | null> {
    const client = this.withSchema();
    const { data, error } = await client
      .from('metas')
      .select('*')
      .eq('mes', mes)
      .eq('ano', ano)
      .maybeSingle();

    if (error) {
      console.error('[MetasService] Erro ao buscar meta do mês:', error.message);
      return null;
    }

    return (data as Meta) || null;
  }

  async getMetas(): Promise<Meta[]> {
    const client = this.withSchema();
    const { data, error } = await client
      .from('metas')
      .select('*')
      .order('ano', { ascending: false })
      .order('mes', { ascending: false });

    if (error) {
      console.error('[MetasService] Erro ao buscar metas:', error.message);
      return [];
    }

    return (data as Meta[]) || [];
  }

  async upsertMeta(payload: MetaUpsert): Promise<Meta | null> {
    const client = this.withSchema();
    const { data: userData } = await this.supabase.auth.getUser();
    const corretorId = userData.user?.id;
    if (!corretorId) return null;

    const { data, error } = await client
      .from('metas')
      .upsert([{ ...payload, corretor_id: corretorId, updated_at: new Date().toISOString() }], {
        onConflict: 'corretor_id,mes,ano',
      })
      .select()
      .maybeSingle();

    if (error) {
      console.error('[MetasService] Erro ao salvar meta:', error.message);
      return null;
    }

    return (data as Meta) || null;
  }
}
