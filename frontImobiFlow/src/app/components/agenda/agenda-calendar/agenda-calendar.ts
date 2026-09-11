import { Component, EventEmitter, OnInit, Output, computed, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { WhatsappIconComponent } from '../../icons/whatsapp-icon-component/whatsapp-icon-component';
import { Visita, VisitsService } from '../../../services/visits.service';
import { LeadsService } from '../../../services/leads.service';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

interface DiaCelula {
  date: Date;
  key: string;
  inMonth: boolean;
  isToday: boolean;
  visitas: Visita[];
}

function diaKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

@Component({
  selector: 'app-agenda-calendar',
  imports: [DatePipe, WhatsappIconComponent],
  template: `
    <div class="flex flex-col w-full h-full min-h-0 gap-3">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-gray-900">Agenda</h2>
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
          (click)="createNew.emit()"
        >
          + Nova visita
        </button>
      </div>

      <div class="flex-1 min-h-0 overflow-y-auto flex flex-col lg:flex-row gap-4">
        <div class="lg:w-[380px] shrink-0 rounded-xl border border-gray-200 bg-white p-3">
          <div class="flex items-center justify-between mb-3">
            <button type="button" class="px-2 py-1 rounded hover:bg-gray-100 text-gray-600" (click)="prevMes()">
              ‹
            </button>
            <span class="text-sm font-semibold text-gray-900">{{ nomeMes() }} {{ ano() }}</span>
            <button type="button" class="px-2 py-1 rounded hover:bg-gray-100 text-gray-600" (click)="nextMes()">
              ›
            </button>
          </div>

          <div class="grid grid-cols-7 gap-1 text-center text-[0.7rem] text-gray-400 mb-1">
            @for (d of diasSemana; track $index) {
              <span>{{ d }}</span>
            }
          </div>

          <div class="grid grid-cols-7 gap-1">
            @for (dia of diasDoMes(); track dia.key) {
              <button
                type="button"
                class="aspect-square rounded-lg text-xs flex flex-col items-center justify-center gap-0.5 transition-colors"
                [class]="
                  (dia.key === selectedKey() ? 'bg-indigo-600 text-white' : '') +
                  (dia.key !== selectedKey() && dia.isToday ? ' bg-indigo-50 text-indigo-700 font-semibold' : '') +
                  (dia.key !== selectedKey() && !dia.isToday ? (dia.inMonth ? ' text-gray-700 hover:bg-gray-100' : ' text-gray-300 hover:bg-gray-50') : '')
                "
                (click)="selectDia(dia)"
              >
                <span>{{ dia.date.getDate() }}</span>
                @if (dia.visitas.length > 0) {
                  <span
                    class="w-1.5 h-1.5 rounded-full"
                    [class]="dia.key === selectedKey() ? 'bg-white' : 'bg-indigo-500'"
                  ></span>
                }
              </button>
            }
          </div>
        </div>

        <div class="flex-1 min-h-0 flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <span class="text-sm font-semibold text-gray-700">{{
              selectedKey() ? ('Visitas em ' + (selectedDate() | date: 'dd/MM/yyyy')) : 'Próximas visitas'
            }}</span>
            @if (selectedKey()) {
              <button type="button" class="text-xs text-indigo-600 hover:underline" (click)="clearSelection()">
                ver próximas
              </button>
            }
          </div>

          @if (listaAtual().length === 0) {
            <div
              class="flex-1 flex items-center justify-center text-gray-500 text-sm border border-dashed border-gray-300 rounded-xl"
            >
              Nenhuma visita por aqui.
            </div>
          } @else {
            <div class="flex flex-col gap-2 overflow-y-auto">
              @for (v of listaAtual(); track v.id) {
                <div class="rounded-lg bg-white border border-gray-200 shadow-sm p-3">
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex flex-col gap-0.5 min-w-0">
                      <span class="font-medium text-gray-900 text-sm truncate">{{
                        v.lead?.nome || 'Sem nome'
                      }}</span>
                      <span class="text-xs text-gray-500"
                        >{{ v.data_hora | date: 'dd/MM/yyyy' }} às {{ v.data_hora | date: 'HH:mm' }}</span
                      >
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                      @if (v.lead?.tel) {
                        <a
                          [href]="leadsService.formatWhatsAppUrl(v.lead!.tel)"
                          target="_blank"
                        >
                          <app-whatsapp-icon-component [size]="18" />
                        </a>
                      }
                      <span
                        class="inline-flex items-center px-2 py-0.5 rounded-full text-[0.7rem] font-semibold"
                        [class]="statusClass(v.status)"
                        >{{ statusLabel(v.status) }}</span
                      >
                    </div>
                  </div>

                  @if (v.imovel) {
                    <div class="mt-1 text-xs text-gray-600 truncate">
                      {{ v.imovel.imv_codigo }} — {{ v.imovel.titulo || 'Sem título' }}
                    </div>
                  }

                  <div class="mt-2 flex gap-3 text-xs">
                    @if (v.status === 'agendada') {
                      <button type="button" class="text-green-700 hover:underline" (click)="marcarStatus(v, 'realizada')">
                        Marcar realizada
                      </button>
                      <button type="button" class="text-red-600 hover:underline" (click)="marcarStatus(v, 'cancelada')">
                        Cancelar
                      </button>
                    }
                    <button type="button" class="text-indigo-600 hover:underline" (click)="edit.emit(v)">
                      Editar
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class AgendaCalendarComponent implements OnInit {
  visitas = signal<Visita[]>([]);
  loading = signal(true);
  mesAtual = signal<Date>(new Date());
  selectedDate = signal<Date | null>(null);

  diasSemana = DIAS_SEMANA;

  @Output() createNew = new EventEmitter<void>();
  @Output() edit = new EventEmitter<Visita>();

  constructor(
    private visitsService: VisitsService,
    public leadsService: LeadsService,
  ) {}

  nomeMes = computed(() => MESES[this.mesAtual().getMonth()]);
  ano = computed(() => this.mesAtual().getFullYear());
  selectedKey = computed(() => (this.selectedDate() ? diaKey(this.selectedDate()!) : null));

  visitasPorDia = computed(() => {
    const map = new Map<string, Visita[]>();
    for (const v of this.visitas()) {
      const key = diaKey(new Date(v.data_hora));
      const arr = map.get(key) || [];
      arr.push(v);
      map.set(key, arr);
    }
    return map;
  });

  diasDoMes = computed<DiaCelula[]>(() => {
    const ref = this.mesAtual();
    const primeiroDoMes = new Date(ref.getFullYear(), ref.getMonth(), 1);
    const inicioGrid = new Date(primeiroDoMes);
    inicioGrid.setDate(inicioGrid.getDate() - primeiroDoMes.getDay());

    const hojeKey = diaKey(new Date());
    const porDia = this.visitasPorDia();
    const dias: DiaCelula[] = [];

    for (let i = 0; i < 42; i++) {
      const date = new Date(inicioGrid);
      date.setDate(inicioGrid.getDate() + i);
      const key = diaKey(date);
      dias.push({
        date,
        key,
        inMonth: date.getMonth() === ref.getMonth(),
        isToday: key === hojeKey,
        visitas: porDia.get(key) || [],
      });
    }

    return dias;
  });

  proximasVisitas = computed(() => {
    const agora = Date.now();
    return this.visitas()
      .filter((v) => v.status !== 'cancelada' && new Date(v.data_hora).getTime() >= agora)
      .slice(0, 10);
  });

  listaAtual = computed(() => {
    const key = this.selectedKey();
    if (!key) return this.proximasVisitas();
    return this.visitasPorDia().get(key) || [];
  });

  async ngOnInit() {
    await this.reload();
  }

  async reload() {
    this.loading.set(true);
    this.visitas.set(await this.visitsService.getVisitas());
    this.loading.set(false);
  }

  prevMes() {
    const d = this.mesAtual();
    this.mesAtual.set(new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }

  nextMes() {
    const d = this.mesAtual();
    this.mesAtual.set(new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  selectDia(dia: DiaCelula) {
    if (this.selectedKey() === dia.key) {
      this.selectedDate.set(null);
    } else {
      this.selectedDate.set(dia.date);
    }
  }

  clearSelection() {
    this.selectedDate.set(null);
  }

  async marcarStatus(v: Visita, status: Visita['status']) {
    const statusAnterior = v.status;
    this.visitas.update((list) => list.map((x) => (x.id === v.id ? { ...x, status } : x)));

    const updated = await this.visitsService.updateStatus(v.id, status);
    if (!updated) {
      this.visitas.update((list) => list.map((x) => (x.id === v.id ? { ...x, status: statusAnterior } : x)));
    }
  }

  statusLabel(status: Visita['status']): string {
    return { agendada: 'Agendada', realizada: 'Realizada', cancelada: 'Cancelada' }[status];
  }

  statusClass(status: Visita['status']): string {
    return {
      agendada: 'bg-indigo-50 text-indigo-800',
      realizada: 'bg-green-50 text-green-800',
      cancelada: 'bg-red-50 text-red-800',
    }[status];
  }
}
