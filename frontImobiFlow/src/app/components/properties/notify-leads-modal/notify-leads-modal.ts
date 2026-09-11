import { Component, EventEmitter, Input, OnInit, Output, computed, signal } from '@angular/core';
import { LeadsService, Lead } from '../../../services/leads.service';
import { Imovel, PropertiesService } from '../../../services/properties.service';

const DIACRITICS_REGEX = new RegExp(String.fromCharCode(0x5b, 0x5c, 0x75, 0x30, 0x33, 0x30, 0x30, 0x2d, 0x5c, 0x75, 0x30, 0x33, 0x36, 0x66, 0x5d), 'g');

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(DIACRITICS_REGEX, '').toLowerCase().trim();
}

function contemNormalizado(base: string | null | undefined, busca: string): boolean {
  if (!base) return false;
  return normalizar(base).includes(normalizar(busca));
}

interface LeadMatch {
  lead: Lead;
  selecionado: boolean;
}

@Component({
  selector: 'app-notify-leads-modal',
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" (click)="fecharSeBackdrop($event)">
      <div class="w-[95vw] max-w-lg max-h-[85vh] rounded-2xl bg-white shadow-2xl flex flex-col overflow-hidden" (click)="$event.stopPropagation()">
        <div class="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 class="text-sm font-semibold text-gray-900">Notificar leads — {{ imovel.imv_codigo }}</h3>
          <button type="button" class="text-gray-400 hover:text-gray-600" (click)="close.emit()">✕</button>
        </div>

        <div class="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-3">
          @if (loading()) {
            <div class="text-sm text-gray-500 text-center py-6">Buscando leads com preferência compatível...</div>
          } @else if (matches().length === 0) {
            <div class="text-sm text-gray-500 text-center py-6">
              Nenhum lead com preferência salva bate com este imóvel ainda.
            </div>
          } @else {
            <span class="text-xs text-gray-500">
              {{ matches().length }} lead(s) encontrados. Desmarque quem não quiser notificar.
            </span>
            @for (m of matches(); track m.lead.id) {
              <label class="flex items-start gap-2 p-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                <input type="checkbox" class="mt-1" [checked]="m.selecionado" (change)="toggle(m)" />
                <div class="flex flex-col">
                  <span class="text-sm font-medium text-gray-900">{{ m.lead.nome || 'Sem nome' }}</span>
                  <span class="text-xs text-gray-500">+55 {{ m.lead.tel }}</span>
                  <span class="text-xs text-gray-400">
                    {{ m.lead.preferencias.tipo }} {{ m.lead.preferencias.cidade }}
                    {{ m.lead.preferencias.bairro ? '- ' + m.lead.preferencias.bairro : '' }}
                  </span>
                </div>
              </label>
            }
          }

          @if (resultado()) {
            <div class="text-sm" [class]="resultado()!.erro ? 'text-red-600' : 'text-green-700'">
              {{ resultado()!.texto }}
            </div>
          }
        </div>

        <div class="px-5 py-3 border-t border-gray-100 flex justify-end gap-2">
          <button type="button" class="text-sm text-gray-600 px-3 py-2" (click)="close.emit()">Fechar</button>
          <button
            type="button"
            class="text-sm bg-indigo-600 text-white rounded-lg px-4 py-2 disabled:opacity-50"
            [disabled]="enviando() || selecionados().length === 0"
            (click)="enviar()"
          >
            {{ enviando() ? 'Enviando...' : 'Enviar (' + selecionados().length + ')' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class NotifyLeadsModalComponent implements OnInit {
  @Input({ required: true }) imovel!: Imovel;
  @Output() close = new EventEmitter<void>();

  loading = signal(true);
  enviando = signal(false);
  matches = signal<LeadMatch[]>([]);
  resultado = signal<{ texto: string; erro: boolean } | null>(null);

  constructor(
    private leadsService: LeadsService,
    private propertiesService: PropertiesService,
  ) {}

  selecionados = computed(() => this.matches().filter((m) => m.selecionado));

  async ngOnInit() {
    this.loading.set(true);
    const leads = await this.leadsService.getLeadsComPreferencia();
    const batidos = leads.filter((l) => this.bateComPreferencia(l));
    this.matches.set(batidos.map((lead) => ({ lead, selecionado: true })));
    this.loading.set(false);
  }

  private bateComPreferencia(lead: Lead): boolean {
    const p = lead.preferencias;
    const i = this.imovel;

    if (p.tipo && normalizar(p.tipo) !== normalizar(i.tipo)) return false;
    if (p.finalidade && p.finalidade !== i.finalidade) return false;
    if (p.cidade && !contemNormalizado(i.cidade?.nome, p.cidade)) return false;
    if (p.bairro && !contemNormalizado(i.bairro?.nome, p.bairro)) return false;

    if (p.quartos != null && i.quartos != null) {
      if (Math.abs(i.quartos - p.quartos) > 2) return false;
    }

    if (p.preco_min != null && p.preco_max != null) {
      const igual = p.preco_min === p.preco_max;
      const min = igual ? p.preco_min * 0.5 : p.preco_min;
      const max = igual ? p.preco_max * 1.5 : p.preco_max;
      if (i.preco < min || i.preco > max) return false;
    } else if (p.preco_min != null) {
      if (i.preco < p.preco_min) return false;
    } else if (p.preco_max != null) {
      if (i.preco > p.preco_max) return false;
    }

    return true;
  }

  toggle(m: LeadMatch) {
    this.matches.update((list) =>
      list.map((x) => (x.lead.id === m.lead.id ? { ...x, selecionado: !x.selecionado } : x)),
    );
  }

  private montarMensagem(): string {
    const i = this.imovel;
    const preco = this.propertiesService.formatCurrency(i.preco);
    let msg = `Encontramos um imóvel que pode te interessar!\n\n${i.imv_codigo} — ${i.titulo || i.tipo}\n${preco}`;
    if (i.bairro) msg += `\n${i.bairro.nome}, ${i.cidade?.nome}`;
    else msg += `\n${i.cidade?.nome}`;
    if (i.fonte_url) msg += `\n\n${i.fonte_url}`;
    return msg;
  }

  async enviar() {
    this.enviando.set(true);
    this.resultado.set(null);
    const mensagem = this.montarMensagem();

    let enviados = 0;
    for (const m of this.selecionados()) {
      const ok = await this.leadsService.sendMessage(m.lead.tel, mensagem);
      if (ok) enviados++;
    }

    this.enviando.set(false);
    const total = this.selecionados().length;
    this.resultado.set({
      texto: `Enviado para ${enviados} de ${total} lead(s).`,
      erro: enviados < total,
    });
  }

  fecharSeBackdrop(event: MouseEvent) {
    if (event.target === event.currentTarget) this.close.emit();
  }
}
