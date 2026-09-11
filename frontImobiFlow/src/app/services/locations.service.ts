import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

export interface UF {
  id: number;
  sigla: string;
  nome: string;
}

export interface Cidade {
  id: number;
  uf_id: number;
  nome: string;
}

export interface Bairro {
  id: number;
  cidade_id: number;
  nome: string;
}

export interface Regiao {
  id: number;
  cidade_id: number;
  nome: string;
}

export interface Comodidade {
  id: number;
  nome: string;
}

@Injectable({
  providedIn: 'root',
})
export class LocationsService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
  }

  private withSchema() {
    return (this.supabase as unknown as { schema: (s: string) => SupabaseClient }).schema('pierre');
  }

  async getUFs(): Promise<UF[]> {
    const { data, error } = await this.withSchema().from('uf').select('*').order('nome');
    if (error) {
      console.error('[LocationsService] Erro ao buscar UFs:', error.message);
      return [];
    }
    return (data as UF[]) || [];
  }

  async getCidades(ufId: number): Promise<Cidade[]> {
    const { data, error } = await this.withSchema()
      .from('cidades')
      .select('*')
      .eq('uf_id', ufId)
      .order('nome');
    if (error) {
      console.error('[LocationsService] Erro ao buscar cidades:', error.message);
      return [];
    }
    return (data as Cidade[]) || [];
  }

  async getBairros(cidadeId: number): Promise<Bairro[]> {
    const { data, error } = await this.withSchema()
      .from('bairros')
      .select('*')
      .eq('cidade_id', cidadeId)
      .order('nome');
    if (error) {
      console.error('[LocationsService] Erro ao buscar bairros:', error.message);
      return [];
    }
    return (data as Bairro[]) || [];
  }

  async getRegioes(cidadeId: number): Promise<Regiao[]> {
    const { data, error } = await this.withSchema()
      .from('regioes')
      .select('*')
      .eq('cidade_id', cidadeId)
      .order('nome');
    if (error) {
      console.error('[LocationsService] Erro ao buscar regiões:', error.message);
      return [];
    }
    return (data as Regiao[]) || [];
  }

  async getComodidades(): Promise<Comodidade[]> {
    const { data, error } = await this.withSchema().from('comodidades').select('*').order('nome');
    if (error) {
      console.error('[LocationsService] Erro ao buscar comodidades:', error.message);
      return [];
    }
    return (data as Comodidade[]) || [];
  }

  async createCidade(ufId: number, nome: string): Promise<Cidade | null> {
    const { data, error } = await this.withSchema()
      .from('cidades')
      .insert([{ uf_id: ufId, nome }])
      .select()
      .maybeSingle();
    if (error) {
      console.error('[LocationsService] Erro ao criar cidade:', error.message);
      return null;
    }
    return (data as Cidade) || null;
  }

  async createBairro(cidadeId: number, nome: string): Promise<Bairro | null> {
    const { data, error } = await this.withSchema()
      .from('bairros')
      .insert([{ cidade_id: cidadeId, nome }])
      .select()
      .maybeSingle();
    if (error) {
      console.error('[LocationsService] Erro ao criar bairro:', error.message);
      return null;
    }
    return (data as Bairro) || null;
  }

  async createRegiao(cidadeId: number, nome: string): Promise<Regiao | null> {
    const { data, error } = await this.withSchema()
      .from('regioes')
      .insert([{ cidade_id: cidadeId, nome }])
      .select()
      .maybeSingle();
    if (error) {
      console.error('[LocationsService] Erro ao criar região:', error.message);
      return null;
    }
    return (data as Regiao) || null;
  }

  async createComodidade(nome: string): Promise<Comodidade | null> {
    const { data, error } = await this.withSchema()
      .from('comodidades')
      .insert([{ nome }])
      .select()
      .maybeSingle();
    if (error) {
      console.error('[LocationsService] Erro ao criar comodidade:', error.message);
      return null;
    }
    return (data as Comodidade) || null;
  }
}
