import { Component, OnInit, computed, signal } from '@angular/core';
import { LeadsService } from '../../../services/leads.service';
import { PropertiesService, Imovel } from '../../../services/properties.service';
import { NegotiationsService, ETAPAS, Negociacao } from '../../../services/negotiations.service';
import { VisitsService, Visita } from '../../../services/visits.service';

interface BarDatum {
  label: string;
  value: number;
}

@Component({
  selector: 'app-dashboard-component',
  template: `
    <div class="flex flex-col w-full h-full min-h-0 gap-4 overflow-y-auto">
      <h2 class="text-lg font-semibold text-gray-900">Dashboard</h2>

      @if (loading()) {
        <div class="flex-1 flex items-center justify-center text-gray-500 text-sm">Carregando...</div>
      } @else {
        <div class="grid grid-cols-2 lg:grid-cols-5 gap-3">
          @for (tile of statTiles(); track tile.label) {
            <div class="rounded-xl border border-gray-200 bg-white p-4 flex flex-col gap-1">
              <span class="text-xs text-gray-500">{{ tile.label }}</span>
              <span class="text-2xl font-semibold text-gray-900">{{ tile.value }}</span>
            </div>
          }
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div class="rounded-xl border border-gray-200 bg-white p-4 flex flex-col gap-3">
            <span class="text-sm font-semibold text-gray-700">Funil de negociações</span>
            @if (funilData().length === 0 || funilMax() === 0) {
              <span class="text-sm text-gray-500">Nenhuma negociação ainda.</span>
            } @else {
              <div class="flex flex-col gap-2">
                @for (d of funilData(); track d.label) {
                  <div class="flex items-center gap-2">
                    <span class="w-24 shrink-0 text-xs text-gray-600 truncate">{{ d.label }}</span>
                    <div class="flex-1 h-4 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        class="h-full rounded-full bg-emerald-500 transition-all"
                        [style.width.%]="(d.value / funilMax()) * 100"
                      ></div>
                    </div>
                    <span class="w-6 shrink-0 text-xs font-medium text-gray-900 text-right">{{ d.value }}</span>
                  </div>
                }
              </div>
            }
          </div>

          <div class="rounded-xl border border-gray-200 bg-white p-4 flex flex-col gap-3">
            <span class="text-sm font-semibold text-gray-700">Bairros com mais imóveis</span>
            @if (bairrosData().length === 0) {
              <span class="text-sm text-gray-500">Nenhum imóvel com bairro cadastrado.</span>
            } @else {
              <div class="flex flex-col gap-2">
                @for (d of bairrosData(); track d.label) {
                  <div class="flex items-center gap-2">
                    <span class="w-24 shrink-0 text-xs text-gray-600 truncate">{{ d.label }}</span>
                    <div class="flex-1 h-4 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        class="h-full rounded-full bg-emerald-500 transition-all"
                        [style.width.%]="(d.value / bairrosMax()) * 100"
                      ></div>
                    </div>
                    <span class="w-6 shrink-0 text-xs font-medium text-gray-900 text-right">{{ d.value }}</span>
                  </div>
                }
              </div>
            }
          </div>
        </div>

        <div class="rounded-xl border border-gray-200 bg-white p-4 flex flex-col gap-3 max-w-2xl">
          <span class="text-sm font-semibold text-gray-700">Imóveis por finalidade</span>
          @if (finalidadeTotal() === 0) {
            <span class="text-sm text-gray-500">Nenhum imóvel cadastrado.</span>
          } @else {
            <div class="flex h-4 rounded-full overflow-hidden gap-0.5">
              <div class="bg-emerald-500" [style.width.%]="(finalidade().venda / finalidadeTotal()) * 100"></div>
              <div class="bg-amber-500" [style.width.%]="(finalidade().aluguel / finalidadeTotal()) * 100"></div>
            </div>
            <div class="flex items-center gap-4 text-xs text-gray-600">
              <span class="inline-flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                Venda ({{ finalidade().venda }})
              </span>
              <span class="inline-flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                Aluguel ({{ finalidade().aluguel }})
              </span>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  loading = signal(true);

  leads = signal<{ id: number; created_at: string }[]>([]);
  imoveis = signal<Imovel[]>([]);
  negociacoes = signal<Negociacao[]>([]);
  visitas = signal<Visita[]>([]);

  constructor(
    private leadsService: LeadsService,
    private propertiesService: PropertiesService,
    private negotiationsService: NegotiationsService,
    private visitsService: VisitsService,
  ) {}

  async ngOnInit() {
    this.loading.set(true);
    const [leads, imoveis, negociacoes, visitas] = await Promise.all([
      this.leadsService.getLeads(),
      this.propertiesService.getImoveis(),
      this.negotiationsService.getNegociacoes(),
      this.visitsService.getVisitas(),
    ]);
    this.leads.set(leads);
    this.imoveis.set(imoveis);
    this.negociacoes.set(negociacoes);
    this.visitas.set(visitas);
    this.loading.set(false);
  }

  totalLeads = computed(() => this.leads().length);

  leadsNovos7d = computed(() => {
    const seteDiasAtras = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return this.leads().filter((l) => new Date(l.created_at).getTime() >= seteDiasAtras).length;
  });

  imoveisAtivos = computed(() => this.imoveis().filter((i) => i.active !== false).length);

  negociacoesAbertas = computed(
    () => this.negociacoes().filter((n) => n.etapa !== 'fechado' && n.etapa !== 'perdido').length,
  );

  visitasProximos7d = computed(() => {
    const agora = Date.now();
    const em7dias = agora + 7 * 24 * 60 * 60 * 1000;
    return this.visitas().filter((v) => {
      const t = new Date(v.data_hora).getTime();
      return v.status === 'agendada' && t >= agora && t <= em7dias;
    }).length;
  });

  statTiles = computed(() => [
    { label: 'Leads totais', value: this.totalLeads() },
    { label: 'Leads novos (7 dias)', value: this.leadsNovos7d() },
    { label: 'Imóveis ativos', value: this.imoveisAtivos() },
    { label: 'Minhas negociações abertas', value: this.negociacoesAbertas() },
    { label: 'Minhas visitas (7 dias)', value: this.visitasProximos7d() },
  ]);

  funilData = computed<BarDatum[]>(() => {
    const negociacoes = this.negociacoes();
    return ETAPAS.map((e) => ({
      label: e.label,
      value: negociacoes.filter((n) => n.etapa === e.value).length,
    }));
  });

  funilMax = computed(() => Math.max(1, ...this.funilData().map((d) => d.value)));

  bairrosData = computed<BarDatum[]>(() => {
    const counts = new Map<string, number>();
    for (const i of this.imoveis()) {
      if (!i.bairro) continue;
      counts.set(i.bairro.nome, (counts.get(i.bairro.nome) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  });

  bairrosMax = computed(() => Math.max(1, ...this.bairrosData().map((d) => d.value)));

  finalidade = computed(() => {
    const imoveis = this.imoveis();
    return {
      venda: imoveis.filter((i) => i.finalidade === 'venda').length,
      aluguel: imoveis.filter((i) => i.finalidade === 'aluguel').length,
    };
  });

  finalidadeTotal = computed(() => this.finalidade().venda + this.finalidade().aluguel);
}
