import { Component, HostListener, OnDestroy, ViewChild, signal } from '@angular/core';
import { LeadsListComponent } from "../leads-list-component/leads-list-component";
import { LeadConversation } from "../lead-conversation/lead-conversation";
import { Lead } from "../../../services/leads.service";
import { LucideX } from '@lucide/angular';

@Component({
  selector: 'app-leads-component',
  imports: [LeadsListComponent, LeadConversation, LucideX],
  template: `
    <div class="flex w-full h-full min-h-0 overflow-auto ">
      <div class="w-full h-full min-w-0 min-h-0 flex flex-col bg-amber-200">
        <app-leads-list-component
          class="flex-1 min-h-0 w-full flex flex-col"
          (leadSelected)="onLeadSelected($event)"
        />
      </div>

      @if (isModalOpen()) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
          (click)="onBackdropClick($event)"
        >
          <div
            class="relative w-[95vw] h-[95vh] max-w-5xl max-h-[900px] rounded-2xl bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            (click)="$event.stopPropagation()"
          >
            <button
              type="button"
              class="absolute top-1 right-1 z-10 inline-flex items-center justify-center w-9 h-9 rounded-full bg-gray-200 text-gray-500 hover:bg-gray-300 hover:text-gray-700 hover:cursor-pointer transition-colors duration-100"
              (click)="closeModal()"
              title="Fechar (Esc)"
              aria-label="Fechar conversa"
            >
              <svg lucideX [size]="20"></svg>
            </button>

            <div class="w-full h-full">
              <app-lead-conversation [lead]="selectedLead()" (leadUpdated)="onLeadUpdated($event)" />
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class LeadsComponent implements OnDestroy {
  @ViewChild(LeadsListComponent) leadsList?: LeadsListComponent;

  selectedLead = signal<Lead | null>(null);
  isModalOpen = signal(false);
  private previousOverflow = '';

  onLeadUpdated(lead: Lead) {
    this.selectedLead.set(lead);
    this.leadsList?.loadLeads();
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: Event) {
    if (this.isModalOpen()) {
      event.preventDefault();
      this.closeModal();
    }
  }

  onLeadSelected(lead: Lead | null) {
    this.selectedLead.set(lead);
    if (lead) {
      this.openModal();
    } else {
      this.closeModal();
    }
  }

  openModal() {
    this.isModalOpen.set(true);
    this.previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.selectedLead.set(null);
    document.body.style.overflow = this.previousOverflow;
  }

  onBackdropClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target === event.currentTarget) {
      this.closeModal();
    }
  }

  ngOnDestroy() {
    document.body.style.overflow = this.previousOverflow;
  }
}
