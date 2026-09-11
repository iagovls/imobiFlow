import { Component, OnInit, Output, EventEmitter, signal, computed } from '@angular/core';
import { WhatsappIconComponent } from '../../icons/whatsapp-icon-component/whatsapp-icon-component';
import { LeadsService, Lead, LeadStatus, LEAD_STATUSES } from '../../../services/leads.service';
import { DatePipe } from '@angular/common';

type StatusFiltro = LeadStatus | 'todos';

@Component({
  selector: 'app-leads-list-component',
  imports: [WhatsappIconComponent, DatePipe],
  template: `
    <div
      class="flex flex-col w-full h-full rounded-xl border border-gray-200 bg-white"
    >
      <div class="flex items-center gap-2 px-5 py-2 border-b border-gray-100 overflow-x-auto">
        <button
          type="button"
          class="px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors"
          [class]="statusFiltro() === 'todos' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
          (click)="statusFiltro.set('todos')"
        >
          Todos
        </button>
        @for (s of statuses; track s.value) {
          <button
            type="button"
            class="px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors"
            [class]="statusFiltro() === s.value ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
            (click)="statusFiltro.set(s.value)"
          >
            {{ s.label }}
          </button>
        }
      </div>

      <div
        class="min-h-0 overflow-auto
                  [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]
                  [&::-webkit-scrollbar]:w-2
                  [&::-webkit-scrollbar-track]:bg-transparent
                  [&::-webkit-scrollbar-thumb]:bg-gray-300
                  [&::-webkit-scrollbar-thumb]:rounded-full
                  hover:[&::-webkit-scrollbar-thumb]:bg-gray-400"
      >
        <table class="w-full border-collapse">
          <thead class="sticky top-0 z-10">
            <tr>
              <th
                class="pl-5 py-1 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50 border-b border-gray-200"
              >
                Lead
              </th>
              <th
                class="px-1 py-1 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50 border-b border-gray-200 w-[130px]"
              >
                Status
              </th>
              <th
                class="px-1 py-1 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50 border-b border-gray-200 w-[140px]"
              >
                Corretor
              </th>
              <th
                class="px-1 py-1 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50 border-b border-gray-200 w-[100px]"
              >
                Ticket
              </th>
              <th
                class="px-1 py-1 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50 border-b border-gray-200 w-40"
              >
                Último Contato
              </th>
            </tr>
          </thead>
          <tbody>
            @if (leadsFiltrados().length === 0 && !loading()) {
              <tr>
                <td colspan="5" class="text-center text-gray-500 py-8 border-b border-gray-100">
                  Nenhum lead encontrado
                </td>
              </tr>
            }
            @for (lead of leadsFiltrados(); track lead.id) {
              <tr
                class="cursor-pointer transition-colors duration-150 ease-in-out hover:bg-gray-50"
                [class]="selectedLeadId() === lead.id ? 'bg-blue-50' : ''"
                (click)="selectLead(lead)"
              >
                <td class="pl-5 py-1 border-b border-gray-100 text-sm min-w-[180px]">
                  <div class="flex flex-row items-center gap-2">
                    <div class="flex flex-row items-center gap-2">
                      <div class="flex flex-col items-start gap-1">
                        <span class="font-medium text-gray-900">{{ lead.nome || 'Sem nome' }}</span>
                        <span class="text-xs text-gray-500">+55 {{ formatPhone(lead.tel) }}</span>
                      </div>
                      <a
                        [href]="leadsService.formatWhatsAppUrl(lead.tel)"
                        target="_blank"
                        (click)="$event.stopPropagation()"
                      >
                        <app-whatsapp-icon-component [size]="20" />
                      </a>
                    </div>
                  </div>
                </td>
                <td class="px-1 py-1 border-b border-gray-100 text-sm text-center">
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-[0.7rem] font-semibold"
                    [class]="statusClass(lead.status)"
                    >{{ statusLabel(lead.status) }}</span
                  >
                </td>
                <td class="px-1 py-1 border-b border-gray-100 text-xs text-gray-600 text-center truncate">
                  {{ lead.corretor?.display_name || '—' }}
                </td>
                <td class="px-1 py-3. border-b border-gray-100 text-sm w-25 text-center">
                  @if (lead.ticket) {
                    <span
                      class="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 font-semibold text-[0.8125rem]"
                      >{{ formatCurrency(lead.ticket) }}</span
                    >
                  } @else {
                    <span class="text-gray-400 text-sm">—</span>
                  }
                </td>
                <td
                  class="px-1 py-3. border-b border-gray-100 w-[140px] text-gray-500 text-sm text-center"
                >
                  @if (lead.ultimo_contato) {
                    <span class="font-semibold">{{ lead.ultimo_contato | date: 'dd/MM/yyyy' }}</span>
                    <span> - {{ lead.ultimo_contato | date: 'HH:mm' }}</span>
                  } @else {
                    <span class="text-gray-400 text-sm">—</span>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class LeadsListComponent implements OnInit {
  leads = signal<Lead[]>([]);
  loading = signal(true);
  selectedLeadId = signal<number | null>(null);
  statusFiltro = signal<StatusFiltro>('todos');

  statuses = LEAD_STATUSES;

  @Output() leadSelected = new EventEmitter<Lead | null>();

  constructor(public leadsService: LeadsService) {}

  leadsFiltrados = computed(() => {
    const filtro = this.statusFiltro();
    if (filtro === 'todos') return this.leads();
    return this.leads().filter((l) => l.status === filtro);
  });

  formatCurrency(value: number | null): string {
    if (value == null) return '';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(value);
  }

  formatPhone(tel: number): string {
    let str = tel.toString();
    if (str.startsWith('55')) str = str.slice(2);
    if (str.length === 11) {
      return `(${str.slice(0, 2)}) ${str.slice(2, 7)}-${str.slice(7)}`;
    } else if (str.length === 10) {
      return `(${str.slice(0, 2)}) ${str.slice(2, 6)}-${str.slice(6)}`;
    }
    return str;
  }

  statusLabel(status: LeadStatus): string {
    return LEAD_STATUSES.find((s) => s.value === status)?.label ?? status;
  }

  statusClass(status: LeadStatus): string {
    return {
      novo: 'bg-indigo-50 text-indigo-800',
      em_atendimento: 'bg-amber-50 text-amber-800',
      qualificado: 'bg-green-50 text-green-800',
      perdido: 'bg-red-50 text-red-800',
    }[status];
  }

  async ngOnInit() {
    await this.loadLeads();
  }

  async loadLeads() {
    this.loading.set(true);
    const data = await this.leadsService.getLeads();
    this.leads.set(data);

    this.loading.set(false);
  }

  selectLead(lead: Lead) {
    if (this.selectedLeadId() === lead.id) {
      this.selectedLeadId.set(null);
      this.leadSelected.emit(null);
    } else {
      this.selectedLeadId.set(lead.id);
      this.leadSelected.emit(lead);
    }
  }
}
