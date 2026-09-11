import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LeadsService, Lead } from '../../../services/leads.service';
import { PropertiesService, Imovel } from '../../../services/properties.service';
import { Visita, VisitaStatus, VisitsService } from '../../../services/visits.service';

const STATUSES: { value: VisitaStatus; label: string }[] = [
  { value: 'agendada', label: 'Agendada' },
  { value: 'realizada', label: 'Realizada' },
  { value: 'cancelada', label: 'Cancelada' },
];

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

@Component({
  selector: 'app-visit-form',
  imports: [FormsModule],
  template: `
    <div class="flex flex-col w-full h-full min-h-0 gap-4 p-4 overflow-y-auto">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-gray-900">
          {{ visita ? 'Editar visita' : 'Nova visita' }}
        </h2>
        <button type="button" class="text-sm text-gray-500 hover:underline" (click)="goBack.emit()">
          Voltar
        </button>
      </div>

      <div class="flex flex-col gap-3 max-w-md">
        @if (!visita) {
          <label class="flex flex-col gap-1 text-sm">
            <span class="font-medium text-gray-700">Lead *</span>
            <select class="rounded-lg border border-gray-300 px-3 py-2 text-sm" [(ngModel)]="leadId">
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
          <span class="font-medium text-gray-700">Data e hora *</span>
          <input
            type="datetime-local"
            class="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            [(ngModel)]="dataHora"
          />
        </label>

        @if (visita) {
          <label class="flex flex-col gap-1 text-sm">
            <span class="font-medium text-gray-700">Status</span>
            <select class="rounded-lg border border-gray-300 px-3 py-2 text-sm" [(ngModel)]="status">
              @for (s of statuses; track s.value) {
                <option [ngValue]="s.value">{{ s.label }}</option>
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
            [disabled]="saving() || (!visita && !leadId) || !dataHora"
            (click)="save()"
          >
            {{ saving() ? 'Salvando...' : 'Salvar' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class VisitFormComponent implements OnInit {
  @Input() visita: Visita | null = null;
  @Output() goBack = new EventEmitter<void>();
  @Output() saved = new EventEmitter<Visita>();

  leads = signal<Lead[]>([]);
  imoveis = signal<Imovel[]>([]);
  saving = signal(false);
  error = signal('');

  statuses = STATUSES;

  leadId: number | null = null;
  imovelId: number | null = null;
  dataHora = '';
  observacoes = '';
  status: VisitaStatus = 'agendada';

  constructor(
    private leadsService: LeadsService,
    private propertiesService: PropertiesService,
    private visitsService: VisitsService,
  ) {}

  async ngOnInit() {
    const [leads, imoveis] = await Promise.all([
      this.leadsService.getLeads(),
      this.propertiesService.getImoveis(true),
    ]);
    this.leads.set(leads);
    this.imoveis.set(imoveis);

    if (this.visita) {
      this.imovelId = this.visita.imovel_id;
      this.dataHora = toDatetimeLocal(this.visita.data_hora);
      this.observacoes = this.visita.observacoes || '';
      this.status = this.visita.status;
    }
  }

  async save() {
    this.error.set('');
    this.saving.set(true);

    const dataHoraIso = new Date(this.dataHora).toISOString();

    const result = this.visita
      ? await this.visitsService.updateVisita(this.visita.id, {
          imovel_id: this.imovelId,
          data_hora: dataHoraIso,
          observacoes: this.observacoes || null,
          status: this.status,
        })
      : await this.visitsService.createVisita({
          lead_id: this.leadId!,
          imovel_id: this.imovelId,
          data_hora: dataHoraIso,
          observacoes: this.observacoes || null,
        });

    this.saving.set(false);

    if (!result) {
      this.error.set('Não foi possível salvar a visita. Tente novamente.');
      return;
    }

    this.saved.emit(result);
  }
}
