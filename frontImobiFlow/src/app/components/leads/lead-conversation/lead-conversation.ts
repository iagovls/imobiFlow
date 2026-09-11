import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnInit, signal, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  Lead,
  ConversationMessage,
  LeadsService,
  LeadStatus,
  LEAD_STATUSES,
  Corretor,
} from "../../../services/leads.service";
import { DatePipe, NgClass } from '@angular/common';
import {
  LucideMessageSquareText,
  LucideUser,
  LucideBot,
  LucideLoader2,
  LucideInbox,
  LucideSend,
} from '@lucide/angular';

@Component({
  selector: 'app-lead-conversation',
  imports: [
    DatePipe,
    NgClass,
    FormsModule,
    LucideMessageSquareText,
    LucideUser,
    LucideBot,
    LucideLoader2,
    LucideInbox,
    LucideSend,
  ],
  templateUrl: './lead-conversation.html',
})
export class LeadConversation implements OnChanges, OnInit, AfterViewChecked {
  @Input() lead: Lead | null = null;
  @Output() leadUpdated = new EventEmitter<Lead>();
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  messages = signal<ConversationMessage[]>([]);
  loading = signal(false);
  corretores = signal<Corretor[]>([]);
  sending = signal(false);
  novaMensagem = '';

  statuses = LEAD_STATUSES;

  private shouldScrollToBottom = false;

  constructor(private leadsService: LeadsService) {}

  async ngOnInit() {
    this.corretores.set(await this.leadsService.getCorretores());
    if (this.lead) {
      this.loadConversation();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['lead'] && this.lead) {
      this.loadConversation();
    } else if (changes['lead'] && !this.lead) {
      this.messages.set([]);
    }
  }

  ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  async loadConversation() {
    if (!this.lead) return;

    this.loading.set(true);
    const data = await this.leadsService.getConversationByTel(this.lead.tel);
    this.messages.set(data);
    console.log('[LeadConversation] Messages:', this.messages());

    this.loading.set(false);
    this.shouldScrollToBottom = true;
  }

  private scrollToBottom(): void {
    try {
      const el = this.messagesContainer?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    } catch (err) {
      console.warn('[LeadConversation] Scroll to bottom failed:', err);
    }
  }

  isUserMessage(role: string): boolean {
    const r = role.toLowerCase();
    return r.includes('user');
  }

  isAssistantMessage(role: string): boolean {
    const r = role.toLowerCase();
    return r.includes('assistant');
  }

  getWhatsAppUrl(): string {
    return this.lead ? this.leadsService.formatWhatsAppUrl(this.lead.tel) : '';
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

  isCorretorMessage(role: string): boolean {
    return role.toLowerCase().includes('corretor');
  }

  async onStatusChange(status: LeadStatus) {
    if (!this.lead) return;
    const updated = await this.leadsService.updateLead(this.lead.id, { status });
    if (updated) {
      this.lead = updated;
      this.leadUpdated.emit(updated);
    }
  }

  async onCorretorChange(corretorId: string) {
    if (!this.lead) return;
    const updated = await this.leadsService.updateLead(this.lead.id, {
      corretor_id: corretorId || null,
    });
    if (updated) {
      this.lead = updated;
      this.leadUpdated.emit(updated);
    }
  }

  async enviarMensagem() {
    const texto = this.novaMensagem.trim();
    if (!texto || !this.lead || this.sending()) return;

    this.sending.set(true);
    const enviado = await this.leadsService.sendMessage(this.lead.tel, texto);
    this.sending.set(false);

    if (enviado) {
      this.novaMensagem = '';
      this.messages.update((list) => [...list, enviado]);
      this.shouldScrollToBottom = true;
    }
  }
}
