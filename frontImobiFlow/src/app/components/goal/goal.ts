import { Component, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucidePencil } from '@lucide/angular';
import { MetasService, Meta } from '../../services/metas.service';
import { NegotiationsService, Negociacao } from '../../services/negotiations.service';

@Component({
  selector: 'app-goal',
  standalone: true,
  imports: [FormsModule, LucidePencil],
  template: `
    <div class="rounded-lg bg-emerald-600 p-4 text-white">
      @if (loading()) {
        <div class="text-sm">Carregando meta...</div>
      } @else if (editando()) {
        <div class="flex flex-col gap-2">
          <span class="text-sm font-semibold">Meta do mês</span>
          <label class="flex flex-col gap-0.5 text-xs">
            Valor (R$)
            <input
              type="number"
              min="0"
              class="rounded px-2 py-1 text-sm text-gray-900"
              [(ngModel)]="formValor"
            />
          </label>
          <label class="flex flex-col gap-0.5 text-xs">
            Nº de negociações
            <input
              type="number"
              min="0"
              class="rounded px-2 py-1 text-sm text-gray-900"
              [(ngModel)]="formNegociacoes"
            />
          </label>
          <div class="flex gap-2 mt-1">
            <button
              type="button"
              class="text-xs font-semibold bg-white text-emerald-700 rounded px-2 py-1 disabled:opacity-50"
              [disabled]="salvando()"
              (click)="salvar()"
            >
              {{ salvando() ? 'Salvando...' : 'Salvar' }}
            </button>
            @if (meta()) {
              <button type="button" class="text-xs text-white/80" (click)="editando.set(false)">Cancelar</button>
            }
          </div>
        </div>
      } @else if (!meta()) {
        <div class="flex flex-col gap-2">
          <span class="text-sm font-semibold">Defina sua meta do mês</span>
          <button type="button" class="text-xs font-semibold bg-white text-emerald-700 rounded px-2 py-1 w-fit" (click)="abrirEdicao()">
            Definir meta
          </button>
        </div>
      } @else {
        <div class="flex items-start justify-between">
          <div class="text-sm font-semibold">Meta do mês</div>
          <button type="button" class="text-white/70 hover:text-white" (click)="abrirEdicao()" aria-label="Editar meta">
            <svg lucidePencil [size]="14"></svg>
          </button>
        </div>
        <div class="mt-2 text-3xl font-semibold [font-variant-numeric:tabular-nums]">{{ formatCurrency(valorFechado()) }}</div>
        <div class="mt-2 h-2 rounded-full bg-white/25 overflow-hidden">
          <div class="h-full rounded-full bg-white" [style.width.%]="progresso()"></div>
        </div>
        <div class="mt-2 text-sm text-white/85">
          @if (faltamContratos() <= 0) {
            Meta batida! 🎉
          } @else {
            Faltam {{ faltamContratos() }} {{ faltamContratos() === 1 ? 'contrato' : 'contratos' }} para fechar a meta comercial.
          }
        </div>
      }
    </div>
  `,
})
export class Goal implements OnInit {
  loading = signal(true);
  editando = signal(false);
  salvando = signal(false);
  meta = signal<Meta | null>(null);
  negociacoes = signal<Negociacao[]>([]);

  formValor = 0;
  formNegociacoes = 0;

  constructor(
    private metasService: MetasService,
    private negotiationsService: NegotiationsService,
  ) {}

  async ngOnInit() {
    this.loading.set(true);
    const [meta, negociacoes] = await Promise.all([
      this.metasService.getMetaAtual(),
      this.negotiationsService.getNegociacoes(),
    ]);
    this.meta.set(meta);
    this.negociacoes.set(negociacoes);
    this.loading.set(false);
  }

  private mesAtual = new Date().getMonth() + 1;
  private anoAtual = new Date().getFullYear();

  fechadasNoMes = computed(() =>
    this.negociacoes().filter((n) => {
      if (n.etapa !== 'fechado') return false;
      const d = new Date(n.updated_at);
      return d.getMonth() + 1 === this.mesAtual && d.getFullYear() === this.anoAtual;
    }),
  );

  valorFechado = computed(() => this.fechadasNoMes().reduce((sum, n) => sum + (n.valor_proposta || 0), 0));

  faltamContratos = computed(() => {
    const meta = this.meta();
    if (!meta) return 0;
    return Math.max(0, meta.meta_negociacoes - this.fechadasNoMes().length);
  });

  progresso = computed(() => {
    const meta = this.meta();
    if (!meta || meta.meta_valor <= 0) return 0;
    return Math.min(100, (this.valorFechado() / meta.meta_valor) * 100);
  });

  abrirEdicao() {
    const meta = this.meta();
    this.formValor = meta?.meta_valor ?? 0;
    this.formNegociacoes = meta?.meta_negociacoes ?? 0;
    this.editando.set(true);
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
      this.meta.set(salvo);
      this.editando.set(false);
    }
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }
}
