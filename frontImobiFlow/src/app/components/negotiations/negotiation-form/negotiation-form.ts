import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LeadsService, Lead } from '../../../services/leads.service';
import { PropertiesService, Imovel } from '../../../services/properties.service';
import {
  ETAPAS,
  Etapa,
  Negociacao,
  NegotiationsService,
} from '../../../services/negotiations.service';

@Component({
  selector: 'app-negotiation-form',
  imports: [FormsModule],
  template: `
    <div class="flex flex-col w-full h-full min-h-0 gap-4 p-4 overflow-y-auto">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-gray-900">
          {{ negociacao ? 'Editar negociação' : 'Nova negociação' }}
        </h2>
        <button type="button" class="text-sm text-gray-500 hover:underline" (click)="goBack.emit()">
          Voltar
        </button>
      </div>

      <div class="flex flex-col gap-3 max-w-md">
        @if (!negociacao) {
          <label class="flex flex-col gap-1 text-sm">
            <span class="font-medium text-gray-700">Lead *</span>
            <select
              class="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              [(ngModel)]="leadId"
            >
              <option [ngValue]="null">Selecione um lead</option>
              @for (lead of leads(); track lead.id) {
                <option [ngValue]="lead.id">{{ lead.nome || 'Sem nome' }} — {{ lead.tel }}</option>
              }
            </select>
          </label>
        }

        <label class="flex flex-col gap-1 text-sm">
          <span class="font-medium text-gray-700">Imóvel</span>
          <select class="rounded-lg border border-gray-300 px-3 py-2 text-sm" [(ngModel)]="imovelId">
            <option [ngValue]="null">Nenhum imóvel selecionado</option>
            @for (imovel of imoveis(); track imovel.id) {
              <option [ngValue]="imovel.id">{{ imovel.imv_codigo }} — {{ imovel.titulo }}</option>
            }
          </select>
        </label>

        <label class="flex flex-col gap-1 text-sm">
          <span class="font-medium text-gray-700">Valor da proposta</span>
          <input
            type="number"
            class="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            [(ngModel)]="valorProposta"
            min="0"
          />
        </label>

        @if (negociacao) {
          <label class="flex flex-col gap-1 text-sm">
            <span class="font-medium text-gray-700">Etapa</span>
            <select class="rounded-lg border border-gray-300 px-3 py-2 text-sm" [(ngModel)]="etapa">
              @for (e of etapas; track e.value) {
                <option [ngValue]="e.value">{{ e.label }}</option>
              }
            </select>
          </label>
        }

        <label class="flex flex-col gap-1 text-sm">
          <span class="font-medium text-gray-700">Observações</span>
          <textarea
            class="rounded-lg border border-gray-300 px-3 py-2 text-sm min-h-24"
            [(ngModel)]="observacoes"
          ></textarea>
        </label>

        @if (error()) {
          <span class="text-sm text-red-600">{{ error() }}</span>
        }

        <div class="flex gap-2 mt-2">
          <button
            type="button"
            class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            [disabled]="saving() || (!negociacao && !leadId)"
            (click)="save()"
          >
            {{ saving() ? 'Salvando...' : 'Salvar' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class NegotiationFormComponent implements OnInit {
  @Input() negociacao: Negociacao | null = null;
  @Output() goBack = new EventEmitter<void>();
  @Output() saved = new EventEmitter<Negociacao>();

  leads = signal<Lead[]>([]);
  imoveis = signal<Imovel[]>([]);
  saving = signal(false);
  error = signal('');

  etapas = ETAPAS;

  leadId: number | null = null;
  imovelId: number | null = null;
  valorProposta: number | null = null;
  observacoes = '';
  etapa: Etapa = 'novo';

  constructor(
    private leadsService: LeadsService,
    private propertiesService: PropertiesService,
    private negotiationsService: NegotiationsService,
  ) {}

  async ngOnInit() {
    const [leads, imoveis] = await Promise.all([
      this.leadsService.getLeads(),
      this.propertiesService.getImoveis(true),
    ]);
    this.leads.set(leads);
    this.imoveis.set(imoveis);

    if (this.negociacao) {
      this.imovelId = this.negociacao.imovel_id;
      this.valorProposta = this.negociacao.valor_proposta;
      this.observacoes = this.negociacao.observacoes || '';
      this.etapa = this.negociacao.etapa;
    }
  }

  async save() {
    this.error.set('');
    this.saving.set(true);

    const result = this.negociacao
      ? await this.negotiationsService.updateNegociacao(this.negociacao.id, {
          imovel_id: this.imovelId,
          valor_proposta: this.valorProposta,
          observacoes: this.observacoes || null,
          etapa: this.etapa,
        })
      : await this.negotiationsService.createNegociacao({
          lead_id: this.leadId!,
          imovel_id: this.imovelId,
          valor_proposta: this.valorProposta,
          observacoes: this.observacoes || null,
        });

    this.saving.set(false);

    if (!result) {
      this.error.set('Não foi possível salvar a negociação. Tente novamente.');
      return;
    }

    this.saved.emit(result);
  }
}
