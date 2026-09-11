import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { S3Service } from './s3.service';

export type Finalidade = 'venda' | 'aluguel';

export interface Imovel {
  id: number;
  quartos: number | null;
  imv_codigo: string;
  titulo: string | null;
  fonte_url: string | null;
  suites: number | null;
  tipo: string;
  endereco: string | null;
  preco: number;
  preco_mensal: boolean;
  condominio_preco: number | null;
  iptu_preco: number | null;
  area_util_m2: number | null;
  area_total_m2: number | null;
  vagas_carro: number | null;
  andar: number | null;
  ano: number | null;
  mobiliado: string | null;
  banheiros: number | null;
  imagem_principal: string | null;
  destaques: string | null;
  atualizado_em: string | null;
  aceita_pet: boolean | null;
  finalidade: Finalidade;
  created_at: string;
  comodidades: string | null;
  proximidades: string | null;
  condicoes: string | null;
  restricoes: string | null;
  active: boolean | null;
  uf_id: number;
  cidade_id: number;
  bairro_id: number | null;
  regiao_id: number | null;
  imagens_ordem: string[];
  /** Relação embutida (read-only), vinda do JOIN no select do PostgREST. */
  uf?: { id: number; sigla: string; nome: string };
  cidade?: { id: number; nome: string };
  bairro?: { id: number; nome: string } | null;
  regiao?: { id: number; nome: string } | null;
}

export type ImovelCreate = Omit<
  Imovel,
  'id' | 'created_at' | 'atualizado_em' | 'uf' | 'cidade' | 'bairro' | 'regiao'
>;
export type ImovelUpdate = Partial<ImovelCreate> & { imv_codigo: string };

export interface ImovelImage {
  key: string;
  url: string;
  size?: number;
  lastModified?: string;
  isPrincipal?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class PropertiesService {
  private supabase: SupabaseClient;

  constructor(private s3: S3Service) {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
  }

  private withSchema() {
    const schema = (environment as unknown as { supabaseSchema: string }).supabaseSchema;
    return (this.supabase as unknown as { schema: (s: string) => SupabaseClient }).schema(schema);
  }

  async getImoveis(onlyActive = false): Promise<Imovel[]> {
    const client = this.withSchema();
    let query = client
      .from('imoveis')
      .select('*, uf:uf(id,sigla,nome), cidade:cidades(id,nome), bairro:bairros(id,nome), regiao:regioes(id,nome)')
      .order('created_at', { ascending: false });

    if (onlyActive) {
      query = query.eq('active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[PropertiesService] Erro ao buscar imóveis:', error.message);
      return [];
    }

    return (data as Imovel[]) || [];
  }

  async getNextCodigo(): Promise<string> {
    const client = this.withSchema();
    const { data, error } = await client.from('imoveis').select('imv_codigo');

    if (error) {
      console.error('[PropertiesService] Erro ao calcular próximo código:', error.message);
    }

    const max = ((data as { imv_codigo: string | null }[]) || []).reduce((acc, row) => {
      const match = /^IMV-(\d+)$/i.exec((row.imv_codigo ?? '').trim());
      return match ? Math.max(acc, parseInt(match[1], 10)) : acc;
    }, 0);

    return `IMV-${String(max + 1).padStart(3, '0')}`;
  }

  async getImovelByCodigo(codigo: string): Promise<Imovel | null> {
    const client = this.withSchema();
    const { data, error } = await client
      .from('imoveis')
      .select('*, uf:uf(id,sigla,nome), cidade:cidades(id,nome), bairro:bairros(id,nome), regiao:regioes(id,nome)')
      .eq('imv_codigo', codigo)
      .maybeSingle();

    if (error) {
      console.error('[PropertiesService] Erro ao buscar imóvel por código:', error.message);
      return null;
    }

    return (data as Imovel) || null;
  }

  async createImovel(imovel: ImovelCreate): Promise<Imovel | null> {
    const client = this.withSchema();
    const MAX_TENTATIVAS = 5;
    let created: Imovel | null = null;

    for (let tentativa = 0; tentativa < MAX_TENTATIVAS; tentativa++) {
      const codigo = imovel.imv_codigo?.trim() || (await this.getNextCodigo());
      const payload = { ...imovel, imv_codigo: codigo };

      const { data, error } = await client.from('imoveis').insert([payload]).select().maybeSingle();

      if (!error) {
        created = (data as Imovel) || null;
        break;
      }

      // 23505 = unique_violation: código já usado. Só recalcula se o código é automático.
      if (error.code === '23505' && !imovel.imv_codigo?.trim()) {
        console.warn(`[PropertiesService] Código ${codigo} em uso, gerando outro...`);
        continue;
      }

      console.error('[PropertiesService] Erro ao criar imóvel:', error.message);
      return null;
    }

    if (!created) {
      console.error('[PropertiesService] Não foi possível gerar um código único após várias tentativas.');
      return null;
    }

    if (created?.imv_codigo) {
      const prefix = this.buildImovelKeyPrefix(created.imv_codigo);
      try {
        await this.s3.createFolder(prefix);
      } catch (folderErr) {
        console.warn('[PropertiesService] Falha ao criar pasta S3 para imóvel, mas imóvel foi criado:', folderErr);
      }
    }

    return created;
  }

  async updateImovel(imovel: ImovelUpdate): Promise<Imovel | null> {
    const client = this.withSchema();
    const { imv_codigo, ...payload } = imovel;
    const updateData = { ...payload, atualizado_em: new Date().toISOString() };

    const { data, error } = await client
      .from('imoveis')
      .update(updateData)
      .eq('imv_codigo', imv_codigo)
      .select()
      .maybeSingle();

    if (error) {
      console.error('[PropertiesService] Erro ao atualizar imóvel:', error.message);
      return null;
    }

    return (data as Imovel) || null;
  }

  async deleteImovel(codigo: string): Promise<boolean> {
    const prefix = this.buildImovelKeyPrefix(codigo);
    try {
      const { deleted } = await this.s3.deletePrefix(prefix);
      console.log(`[PropertiesService] Foram excluidos ${deleted} objetos S3 do prefixo ${prefix}`);
    } catch (s3Err) {
      console.warn('[PropertiesService] Falha ao excluir objetos S3, continuando com exclusao do banco:', s3Err);
    }

    const client = this.withSchema();
    const { error } = await client.from('imoveis').delete().eq('imv_codigo', codigo);

    if (error) {
      console.error('[PropertiesService] Erro ao excluir imóvel:', error.message);
      return false;
    }

    return true;
  }

  async setImagemPrincipal(codigo: string, imagem_url: string | null): Promise<Imovel | null> {
    return this.updateImovel({ imv_codigo: codigo, imagem_principal: imagem_url });
  }

  async setImagensOrdem(codigo: string, ordem: string[]): Promise<Imovel | null> {
    return this.updateImovel({ imv_codigo: codigo, imagens_ordem: ordem });
  }

  async setImovelComodidades(imovelId: number, comodidadeIds: number[]): Promise<boolean> {
    const client = this.withSchema();

    const { error: deleteError } = await client
      .from('imovel_comodidades')
      .delete()
      .eq('imovel_id', imovelId);

    if (deleteError) {
      console.error('[PropertiesService] Erro ao limpar comodidades do imóvel:', deleteError.message);
      return false;
    }

    if (comodidadeIds.length === 0) return true;

    const { error: insertError } = await client
      .from('imovel_comodidades')
      .insert(comodidadeIds.map((comodidade_id) => ({ imovel_id: imovelId, comodidade_id })));

    if (insertError) {
      console.error('[PropertiesService] Erro ao salvar comodidades do imóvel:', insertError.message);
      return false;
    }

    return true;
  }

  async getImovelComodidadeIds(imovelId: number): Promise<number[]> {
    const client = this.withSchema();
    const { data, error } = await client
      .from('imovel_comodidades')
      .select('comodidade_id')
      .eq('imovel_id', imovelId);

    if (error) {
      console.error('[PropertiesService] Erro ao buscar comodidades do imóvel:', error.message);
      return [];
    }

    return (data as { comodidade_id: number }[]).map((row) => row.comodidade_id);
  }

  formatCurrency(value: number | null): string {
    if (value == null) return '';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  }

  formatArea(value: number | null): string {
    if (value == null) return '';
    return new Intl.NumberFormat('pt-BR', {
      maximumFractionDigits: 1,
    }).format(value) + ' m²';
  }

  buildImovelKeyPrefix(imovelCodigo: string): string {
    return `${imovelCodigo}/`;
  }
}
