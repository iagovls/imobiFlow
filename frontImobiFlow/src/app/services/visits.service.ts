import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

export type VisitaStatus = 'agendada' | 'realizada' | 'cancelada';

export interface Visita {
  id: number;
  lead_id: number;
  imovel_id: number | null;
  corretor_id: string;
  data_hora: string;
  status: VisitaStatus;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  lead?: { id: number; nome: string | null; tel: number } | null;
  imovel?: { id: number; imv_codigo: string; titulo: string | null } | null;
}

export type VisitaCreate = Pick<Visita, 'lead_id' | 'data_hora'> &
  Partial<Pick<Visita, 'imovel_id' | 'observacoes'>>;

export type VisitaUpdate = Partial<
  Pick<Visita, 'imovel_id' | 'data_hora' | 'observacoes' | 'status'>
>;

@Injectable({
  providedIn: 'root',
})
export class VisitsService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
  }

  private withSchema() {
    return (this.supabase as unknown as { schema: (s: string) => SupabaseClient }).schema('pierre');
  }

  async getVisitas(): Promise<Visita[]> {
    const client = this.withSchema();
    const { data, error } = await client
      .from('visitas')
      .select('*, lead:usuarios(id,nome,tel), imovel:imoveis(id,imv_codigo,titulo)')
      .order('data_hora', { ascending: true });

    if (error) {
      console.error('[VisitsService] Erro ao buscar visitas:', error.message);
      return [];
    }

    return (data as unknown as Visita[]) || [];
  }

  async createVisita(payload: VisitaCreate): Promise<Visita | null> {
    const client = this.withSchema();
    const { data, error } = await client
      .from('visitas')
      .insert([payload])
      .select('*, lead:usuarios(id,nome,tel), imovel:imoveis(id,imv_codigo,titulo)')
      .maybeSingle();

    if (error) {
      console.error('[VisitsService] Erro ao criar visita:', error.message);
      return null;
    }

    return (data as unknown as Visita) || null;
  }

  async updateVisita(id: number, payload: VisitaUpdate): Promise<Visita | null> {
    const client = this.withSchema();
    const updateData = { ...payload, updated_at: new Date().toISOString() };

    const { data, error } = await client
      .from('visitas')
      .update(updateData)
      .eq('id', id)
      .select('*, lead:usuarios(id,nome,tel), imovel:imoveis(id,imv_codigo,titulo)')
      .maybeSingle();

    if (error) {
      console.error('[VisitsService] Erro ao atualizar visita:', error.message);
      return null;
    }

    return (data as unknown as Visita) || null;
  }

  async updateStatus(id: number, status: VisitaStatus): Promise<Visita | null> {
    return this.updateVisita(id, { status });
  }

  async deleteVisita(id: number): Promise<boolean> {
    const client = this.withSchema();
    const { error } = await client.from('visitas').delete().eq('id', id);

    if (error) {
      console.error('[VisitsService] Erro ao excluir visita:', error.message);
      return false;
    }

    return true;
  }
}
