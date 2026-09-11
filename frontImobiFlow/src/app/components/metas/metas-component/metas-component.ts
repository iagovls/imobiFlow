import { Component, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MetasService, Meta } from '../../../services/metas.service';
import { NegotiationsService, Negociacao } from '../../../services/negotiations.service';

const MESES_NOME = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

interface MetaComRealizado extends Meta {
  valorFechado: number;
  negociacoesFechadas: number;
}

@Component({
  selector: 'app-metas-component',
  imports: [FormsModule],
  template: `
    <div class="flex flex-col w-full h-full min-h-0 gap-4 overflow-y-auto">
      <h2 class="text-lg font-semibold text-gray-900">Metas</h2>

      @if (loading()) {
        <div class="flex-1 flex items-center justify-center text-gray-500 text-sm">Carregando...</div>
      } @else {
        <div class="rounded-xl border border-gray-200 bg-white p-4 flex flex-col gap-3 max-w-md">
          <span class="text-sm font-semibold text-gray-700">{{ nomeMes(mesAtual) }} de {{ anoAtual }} (mês atual)</span>

          <label class="flex flex-col gap-1 text-sm">
            <span class="text-gray-600">Meta de valor (R$)</span>
            <input type="number" min="0" class="rounded-lg border border-gray-300 px-3 py-2 text-sm" [(ngModel)]="formValor" />
          </label>
          <label class="flex flex-col gap-1 text-sm">
            <span class="text-gray-600">Meta de negociações fechadas</span>
            <input type="number" min="0" class="rounded-lg border border-gray-300 px-3 py-2 text-sm" [(ngModel)]="formNegociacoes" />
          </label>
          <button
            type="button"
            class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 w-fit"
            [disabled]="salvando()"
            (click)="salvar()"
          >
            {{ salvando() ? 'Salvando...' : 'Salvar meta' }}
          </button>

          <div class="border-t border-gray-100 pt-3 flex flex-col gap-2 text-sm text-gray-700">
            <div class="flex justify-between">
              <span>Fechado no mês</span>
              <span class="font-semibold">{{ formatCurrency(valorFechadoMesAtual()) }} de {{ formatCurrency(formValor) }}</span>
            </div>
            <div class="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div class="h-full rounded-full bg-indigo-500" [style.width.%]="progressoMesAtual()"></div>
            </div>
            <div class="flex justify-between text-xs text-gray-500">
              <span>Negociações fechadas</span>
              <span>{{ negociacoesFechadasMesAtual() }} de {{ formNegociacoes }}</span>
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <span class="text-sm font-semibold text-gray-700">Histórico</span>
          @if (historico().length === 0) {
            <div class="text-sm text-gray-500 border border-dashed border-gray-300 rounded-xl p-4">
              Nenhuma meta definida em meses anteriores ainda.
            </div>
          } @else {
            <div class="flex flex-col gap-2">
              @for (m of historico(); track m.id) {
                <div class="rounded-lg border border-gray-200 bg-white p-3 flex items-center justify-between text-sm">
                  <span class="font-medium text-gray-900 w-32">{{ nomeMes(m.mes) }} {{ m.ano }}</span>
                  <span class="text-gray-600">{{ formatCurrency(m.valorFechado) }} de {{ formatCurrency(m.meta_valor) }}</span>
                  <span class="text-gray-600">{{ m.negociacoesFechadas }}/{{ m.meta_negociacoes }} negociações</span>
                  @if (m.valorFechado >= m.meta_valor && m.negociacoesFechadas >= m.meta_negociacoes) {
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full bg-green-50 text-green-800 text-[0.7rem] font-semibold">
                      Meta batida
                    </span>
                  } @else {
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[0.7rem] font-semibold">
                      Abaixo da meta
                    </span>
                  }
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class MetasComponent implements OnInit {
  loading = signal(true);
  salvando = signal(false);
  metas = signal<Meta[]>([]);
  negociacoes = signal<Negociacao[]>([]);

  formValor = 0;
  formNegociacoes = 0;

  mesAtual = new Date().getMonth() + 1;
  anoAtual = new Date().getFullYear();

  constructor(
    private metasService: MetasService,
    private negotiationsService: NegotiationsService,
  ) {}

  async ngOnInit() {
    this.loading.set(true);
    const [metas, negociacoes] = await Promise.all([
      this.metasService.getMetas(),
      this.negotiationsService.getNegociacoes(),
    ]);
    this.metas.set(metas);
    this.negociacoes.set(negociacoes);

    const metaAtual = metas.find((m) => m.mes === this.mesAtual && m.ano === this.anoAtual);
    this.formValor = metaAtual?.meta_valor ?? 0;
    this.formNegociacoes = metaAtual?.meta_negociacoes ?? 0;

    this.loading.set(false);
  }

  private fechadasDoMes(mes: number, ano: number): Negociacao[] {
    return this.negociacoes().filter((n) => {
      if (n.etapa !== 'fechado') return false;
      const d = new Date(n.updated_at);
      return d.getMonth() + 1 === mes && d.getFullYear() === ano;
    });
  }

  valorFechadoMesAtual = computed(() =>
    this.fechadasDoMes(this.mesAtual, this.anoAtual).reduce((sum, n) => sum + (n.valor_proposta || 0), 0),
  );

  negociacoesFechadasMesAtual = computed(() => this.fechadasDoMes(this.mesAtual, this.anoAtual).length);

  progressoMesAtual = computed(() => {
    if (this.formValor <= 0) return 0;
    return Math.min(100, (this.valorFechadoMesAtual() / this.formValor) * 100);
  });

  historico = computed<MetaComRealizado[]>(() =>
    this.metas()
      .filter((m) => !(m.mes === this.mesAtual && m.ano === this.anoAtual))
      .map((m) => {
        const fechadas = this.fechadasDoMes(m.mes, m.ano);
        return {
          ...m,
          valorFechado: fechadas.reduce((sum, n) => sum + (n.valor_proposta || 0), 0),
          negociacoesFechadas: fechadas.length,
        };
      }),
  );

  nomeMes(mes: number): string {
    return MESES_NOME[mes - 1] ?? String(mes);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  async salvar() {
    this.salvando.set(true);
    const salvo = await this.metasService.upsertMeta({
      mes: this.mesAtual,
      ano: this.anoAtual,
      meta_valor: this.formValor,
      meta_negociacoes: this.formNegociacoes,
    });
    this.salvando.set(false);

    if (salvo) {
      this.metas.update((list) => [salvo, ...list.filter((m) => m.id !== salvo.id)]);
    }
  }
}
