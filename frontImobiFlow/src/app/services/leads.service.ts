import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

export type LeadStatus = 'novo' | 'em_atendimento' | 'qualificado' | 'perdido';

export const LEAD_STATUSES: { value: LeadStatus; label: string }[] = [
  { value: 'novo', label: 'Novo' },
  { value: 'em_atendimento', label: 'Em atendimento' },
  { value: 'qualificado', label: 'Qualificado' },
  { value: 'perdido', label: 'Perdido' },
];

export interface LeadPreferencias {
  tipo?: string;
  finalidade?: 'venda' | 'aluguel';
  cidade?: string;
  bairro?: string;
  preco_min?: number;
  preco_max?: number;
  quartos?: number;
}

export interface Lead {
  id: number;
  nome: string | null;
  tel: number;
  conversation_id: string | null;
  ultimo_contato: string | null;
  ticket: number | null;
  created_at: string;
  email: string | null;
  status: LeadStatus;
  corretor_id: string | null;
  corretor?: { id: string; display_name: string | null } | null;
  preferencias: LeadPreferencias;
}

export interface ConversationMessage {
  id: number;
  created_at: string;
  role: string;
  message: string | null;
  client_id: number;
}

export interface Corretor {
  id: string;
  display_name: string | null;
}

export type LeadUpdate = Partial<Pick<Lead, 'corretor_id' | 'status'>>;

interface LeadsEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
  s3ApiBaseUrl?: string;
}

@Injectable({
  providedIn: 'root',
})
export class LeadsService {
  private supabase: SupabaseClient;
  private readonly env: LeadsEnv = environment as unknown as LeadsEnv;
  private readonly API_BASE_URL: string;

  constructor(private http: HttpClient) {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
    this.API_BASE_URL = this.env.s3ApiBaseUrl ?? `${this.env.supabaseUrl}/functions/v1`;
  }

  private withSchema() {
    return (this.supabase as unknown as { schema: (s: string) => SupabaseClient }).schema('pierre');
  }

  async getLeads(): Promise<Lead[]> {
    const client = this.withSchema();
    const { data, error } = await client
      .from('usuarios')
      .select('*, corretor:profiles(id,display_name)')
      .order('ultimo_contato', { ascending: false, nullsFirst: false });

    if (error) {
      console.error('[LeadsService] Erro ao buscar leads:', error.message);
      return [];
    }

    return (data as unknown as Lead[]) || [];
  }

  async getConversationByTel(tel: number): Promise<ConversationMessage[]> {
    const client = this.withSchema();
    const { data, error } = await client
      .from('conversation')
      .select('*')
      .eq('client_id', tel)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[LeadsService] Erro ao buscar conversa:', error.message);
      return [];
    }

    return (data as ConversationMessage[]) || [];
  }

  async getLeadsComPreferencia(): Promise<Lead[]> {
    const leads = await this.getLeads();
    return leads.filter((l) => l.preferencias && Object.keys(l.preferencias).length > 0);
  }

  async getCorretores(): Promise<Corretor[]> {
    const client = this.withSchema();
    const { data, error } = await client.from('profiles').select('id,display_name');

    if (error) {
      console.error('[LeadsService] Erro ao buscar corretores:', error.message);
      return [];
    }

    return (data as Corretor[]) || [];
  }

  async updateLead(id: number, payload: LeadUpdate): Promise<Lead | null> {
    const client = this.withSchema();
    const { data, error } = await client
      .from('usuarios')
      .update(payload)
      .eq('id', id)
      .select('*, corretor:profiles(id,display_name)')
      .maybeSingle();

    if (error) {
      console.error('[LeadsService] Erro ao atualizar lead:', error.message);
      return null;
    }

    return (data as unknown as Lead) || null;
  }

  async sendMessage(tel: number, message: string): Promise<ConversationMessage | null> {
    try {
      const url = `${this.API_BASE_URL}/send-whatsapp-message`;
      const response = await firstValueFrom(
        this.http.post<{ sent: boolean; saved: boolean; message?: ConversationMessage }>(
          url,
          { tel, message },
          { headers: await this.buildAuthHeaders() },
        ),
      );
      return response.message ?? null;
    } catch (err) {
      console.error('[LeadsService] Erro ao enviar mensagem:', err);
      return null;
    }
  }

  formatWhatsAppUrl(tel: number): string {
    const telStr = tel.toString();
    return `https://wa.me/${telStr}`;
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
