import { Component, EventEmitter, OnInit, Output, computed, signal } from '@angular/core';
import {
  CdkDrag,
  CdkDragDrop,
  CdkDropList,
  CdkDropListGroup,
} from '@angular/cdk/drag-drop';
import { WhatsappIconComponent } from '../../icons/whatsapp-icon-component/whatsapp-icon-component';
import {
  Etapa,
  ETAPAS,
  Negociacao,
  NegotiationsService,
} from '../../../services/negotiations.service';
import { LeadsService } from '../../../services/leads.service';
import { PropertiesService } from '../../../services/properties.service';

@Component({
  selector: 'app-negotiations-board',
  imports: [CdkDropListGroup, CdkDropList, CdkDrag, WhatsappIconComponent],
  template: `
    <div class="flex flex-col w-full h-full min-h-0 gap-3">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-gray-900">Negociações</h2>
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
          (click)="createNew.emit()"
        >
          + Nova negociação
        </button>
      </div>

      @if (!loading() && negociacoes().length === 0) {
        <div
          class="flex-1 flex items-center justify-center text-gray-500 text-sm border border-dashed border-gray-300 rounded-xl"
        >
          Nenhuma negociação ainda. Crie a primeira a partir de um lead.
        </div>
      } @else {
        <div class="flex-1 min-h-0 overflow-x-auto">
          <div class="flex h-full gap-3 min-w-max" cdkDropListGroup>
            @for (col of columns(); track col.value) {
              <div class="flex flex-col w-72 shrink-0 h-full min-h-0 rounded-xl bg-gray-50 border border-gray-200">
                <div class="px-3 py-2 border-b border-gray-200 flex items-center justify-between">
                  <span class="text-xs font-semibold uppercase tracking-wider text-gray-500">{{
                    col.label
                  }}</span>
                  <span
                    class="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-gray-200 text-gray-700 text-[0.7rem] font-semibold"
                    >{{ col.items.length }}</span
                  >
                </div>
                <div
                  class="flex-1 min-h-0 overflow-y-auto p-2 flex flex-col gap-2"
                  cdkDropList
                  [id]="'col-' + col.value"
                  [cdkDropListData]="col.items"
                  (cdkDropListDropped)="onDrop($event, col.value)"
                >
                  @for (n of col.items; track n.id) {
                    <div
                      cdkDrag
                      [cdkDragData]="n"
                      class="rounded-lg bg-white border border-gray-200 shadow-sm p-3 cursor-move hover:border-emerald-300 transition-colors"
                    >
                      <div class="flex items-start justify-between gap-2">
                        <div class="flex flex-col gap-0.5 min-w-0">
                          <span class="font-medium text-gray-900 text-sm truncate">{{
                            n.lead?.nome || 'Sem nome'
                          }}</span>
                          <span class="text-xs text-gray-500">+55 {{ formatPhone(n.lead?.tel) }}</span>
                        </div>
                        @if (n.lead?.tel) {
                          <a
                            [href]="leadsService.formatWhatsAppUrl(n.lead!.tel)"
                            target="_blank"
                            (click)="$event.stopPropagation()"
                          >
                            <app-whatsapp-icon-component [size]="18" />
                          </a>
                        }
                      </div>

                      @if (n.imovel) {
                        <div class="mt-2 text-xs text-gray-600 truncate">
                          {{ n.imovel.imv_codigo }} — {{ n.imovel.titulo || 'Sem título' }}
                        </div>
                      }

                      @if (n.valor_proposta) {
                        <div class="mt-2">
                          <span
                            class="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-semibold text-[0.75rem]"
                            >{{ propertiesService.formatCurrency(n.valor_proposta) }}</span
                          >
                        </div>
                      }

                      <button
                        type="button"
                        class="mt-2 text-xs text-emerald-600 hover:underline"
                        (click)="edit.emit(n)"
                      >
                        Editar
                      </button>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class NegotiationsBoardComponent implements OnInit {
  negociacoes = signal<Negociacao[]>([]);
  loading = signal(true);

  columns = computed(() =>
    ETAPAS.map((etapa) => ({
      ...etapa,
      items: this.negociacoes().filter((n) => n.etapa === etapa.value),
    })),
  );

  @Output() createNew = new EventEmitter<void>();
  @Output() edit = new EventEmitter<Negociacao>();

  constructor(
    private negotiationsService: NegotiationsService,
    public leadsService: LeadsService,
    public propertiesService: PropertiesService,
  ) {}

  async ngOnInit() {
    await this.reload();
  }

  async reload() {
    this.loading.set(true);
    this.negociacoes.set(await this.negotiationsService.getNegociacoes());
    this.loading.set(false);
  }

  async onDrop(event: CdkDragDrop<Negociacao[]>, novaEtapa: Etapa) {
    const item = event.item.data as Negociacao;
    if (!item || item.etapa === novaEtapa) return;

    const etapaAnterior = item.etapa;
    this.negociacoes.update((list) =>
      list.map((n) => (n.id === item.id ? { ...n, etapa: novaEtapa } : n)),
    );

    const updated = await this.negotiationsService.updateEtapa(item.id, novaEtapa);
    if (!updated) {
      this.negociacoes.update((list) =>
        list.map((n) => (n.id === item.id ? { ...n, etapa: etapaAnterior } : n)),
      );
    }
  }

  formatPhone(tel: number | undefined): string {
    if (!tel) return '';
    let str = tel.toString();
    if (str.startsWith('55')) str = str.slice(2);
    if (str.length === 11) {
      return `(${str.slice(0, 2)}) ${str.slice(2, 7)}-${str.slice(7)}`;
    } else if (str.length === 10) {
      return `(${str.slice(0, 2)}) ${str.slice(2, 6)}-${str.slice(6)}`;
    }
    return str;
  }
}
