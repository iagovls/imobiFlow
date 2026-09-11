import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

export type Etapa = 'novo' | 'qualificado' | 'visita' | 'proposta' | 'fechado' | 'perdido';

export const ETAPAS: { value: Etapa; label: string }[] = [
  { value: 'novo', label: 'Novo' },
  { value: 'qualificado', label: 'Qualificado' },
  { value: 'visita', label: 'Visita' },
  { value: 'proposta', label: 'Proposta' },
  { value: 'fechado', label: 'Fechado' },
  { value: 'perdido', label: 'Perdido' },
];

export interface Negociacao {
  id: number;
  lead_id: number;
  imovel_id: number | null;
  corretor_id: string;
  etapa: Etapa;
  valor_proposta: number | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  lead?: { id: number; nome: string | null; tel: number } | null;
  imovel?: {
    id: number;
    imv_codigo: string;
    titulo: string | null;
    imagem_principal: string | null;
    preco: number;
  } | null;
}

export type NegociacaoCreate = Pick<Negociacao, 'lead_id'> &
  Partial<Pick<Negociacao, 'imovel_id' | 'valor_proposta' | 'observacoes'>>;

export type NegociacaoUpdate = Partial<
  Pick<Negociacao, 'imovel_id' | 'valor_proposta' | 'observacoes' | 'etapa'>
>;

@Injectable({
  providedIn: 'root',
})
export class NegotiationsService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
  }

  private withSchema() {
    return (this.supabase as unknown as { schema: (s: string) => SupabaseClient }).schema('pierre');
  }

  async getNegociacoes(): Promise<Negociacao[]> {
    const client = this.withSchema();
    const { data, error } = await client
      .from('negociacoes')
      .select(
        '*, lead:usuarios(id,nome,tel), imovel:imoveis(id,imv_codigo,titulo,imagem_principal,preco)',
      )
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[NegotiationsService] Erro ao buscar negociações:', error.message);
      return [];
    }

    return (data as unknown as Negociacao[]) || [];
  }

  async createNegociacao(payload: NegociacaoCreate): Promise<Negociacao | null> {
    const client = this.withSchema();
    const { data, error } = await client
      .from('negociacoes')
      .insert([payload])
      .select(
        '*, lead:usuarios(id,nome,tel), imovel:imoveis(id,imv_codigo,titulo,imagem_principal,preco)',
      )
      .maybeSingle();

    if (error) {
      console.error('[NegotiationsService] Erro ao criar negociação:', error.message);
      return null;
    }

    return (data as unknown as Negociacao) || null;
  }

  async updateEtapa(id: number, etapa: Etapa): Promise<Negociacao | null> {
    return this.updateNegociacao(id, { etapa });
  }

  async updateNegociacao(id: number, payload: NegociacaoUpdate): Promise<Negociacao | null> {
    const client = this.withSchema();
    const updateData = { ...payload, updated_at: new Date().toISOString() };

    const { data, error } = await client
      .from('negociacoes')
      .update(updateData)
      .eq('id', id)
      .select(
        '*, lead:usuarios(id,nome,tel), imovel:imoveis(id,imv_codigo,titulo,imagem_principal,preco)',
      )
      .maybeSingle();

    if (error) {
      console.error('[NegotiationsService] Erro ao atualizar negociação:', error.message);
      return null;
    }

    return (data as unknown as Negociacao) || null;
  }

  async deleteNegociacao(id: number): Promise<boolean> {
    const client = this.withSchema();
    const { error } = await client.from('negociacoes').delete().eq('id', id);

    if (error) {
      console.error('[NegotiationsService] Erro ao excluir negociação:', error.message);
      return false;
    }

    return true;
  }
}
