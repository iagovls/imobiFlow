import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
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
  google_event_id: string | null;
  created_at: string;
  updated_at: string;
  lead?: { id: number; nome: string | null; tel: number; email: string | null } | null;
  imovel?: { id: number; imv_codigo: string; titulo: string | null } | null;
}

export type VisitaCreate = Pick<Visita, 'lead_id' | 'data_hora'> &
  Partial<Pick<Visita, 'imovel_id' | 'observacoes'>>;

export type VisitaUpdate = Partial<
  Pick<Visita, 'imovel_id' | 'data_hora' | 'observacoes' | 'status'>
>;

interface VisitsEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
  s3ApiBaseUrl?: string;
}

@Injectable({
  providedIn: 'root',
})
export class VisitsService {
  private supabase: SupabaseClient;
  private readonly env: VisitsEnv = environment as unknown as VisitsEnv;
  private readonly API_BASE_URL: string;

  constructor(private http: HttpClient) {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
    this.API_BASE_URL = this.env.s3ApiBaseUrl ?? `${this.env.supabaseUrl}/functions/v1`;
  }

  private withSchema() {
    return (this.supabase as unknown as { schema: (s: string) => SupabaseClient }).schema('pierre');
  }

  async getVisitas(): Promise<Visita[]> {
    const client = this.withSchema();
    const { data, error } = await client
      .from('visitas')
      .select('*, lead:usuarios(id,nome,tel,email), imovel:imoveis(id,imv_codigo,titulo)')
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
      .select('*, lead:usuarios(id,nome,tel,email), imovel:imoveis(id,imv_codigo,titulo)')
      .maybeSingle();

    if (error) {
      console.error('[VisitsService] Erro ao criar visita:', error.message);
      return null;
    }

    const created = (data as unknown as Visita) || null;
    if (created) this.triggerCalendarEvent(created);
    return created;
  }

  async updateVisita(id: number, payload: VisitaUpdate): Promise<Visita | null> {
    const client = this.withSchema();
    const updateData = { ...payload, updated_at: new Date().toISOString() };

    const { data, error } = await client
      .from('visitas')
      .update(updateData)
      .eq('id', id)
      .select('*, lead:usuarios(id,nome,tel,email), imovel:imoveis(id,imv_codigo,titulo)')
      .maybeSingle();

    if (error) {
      console.error('[VisitsService] Erro ao atualizar visita:', error.message);
      return null;
    }

    const updated = (data as unknown as Visita) || null;
    if (updated) this.triggerCalendarEvent(updated);
    return updated;
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

  /**
   * Dispara (fire-and-forget) a criação do evento no Google Agenda quando a
   * visita está agendada e o lead já tem e-mail. A Edge Function revalida
   * tudo server-side; falhas aqui não devem travar o fluxo de salvar a visita.
   */
  private triggerCalendarEvent(visita: Visita): void {
    if (visita.status !== 'agendada' || !visita.lead?.email) return;

    this.buildAuthHeaders()
      .then((headers) =>
        firstValueFrom(
          this.http.post(
            `${this.API_BASE_URL}/trigger-visita-calendar-event`,
            { visita_id: visita.id },
            { headers },
          ),
        ),
      )
      .catch((err) => console.error('[VisitsService] Erro ao disparar evento no Google Agenda:', err));
  }

  private async buildAuthHeaders(): Promise<HttpHeaders> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      apikey: this.env.supabaseAnonKey,
    });

    try {
      const { data } = await this.supabase.auth.getSession();
      const token = data.session?.access_token;
      headers = headers.set('Authorization', `Bearer ${token ?? this.env.supabaseAnonKey}`);
    } catch {
      headers = headers.set('Authorization', `Bearer ${this.env.supabaseAnonKey}`);
    }
    return headers;
  }
}
