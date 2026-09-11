import { Component, signal } from '@angular/core';
import { NegotiationsBoardComponent } from '../negotiations/negotiations-board/negotiations-board';
import { NegotiationFormComponent } from '../negotiations/negotiation-form/negotiation-form';
import { Negociacao } from '../../services/negotiations.service';

type ViewMode = 'board' | 'form';

@Component({
  selector: 'app-negotiations-component',
  imports: [NegotiationsBoardComponent, NegotiationFormComponent],
  template: `
    <div class="flex w-full h-full min-h-0 overflow-hidden">
      <div class="w-full h-full min-w-0 min-h-0 flex flex-col">
        @switch (viewMode()) {
          @case ('board') {
            <app-negotiations-board
              class="flex-1 min-h-0 w-full flex flex-col"
              (createNew)="onCreateNew()"
              (edit)="onEdit($event)"
            />
          }
          @case ('form') {
            <app-negotiation-form
              class="flex-1 min-h-0 w-full flex flex-col"
              [negociacao]="selectedNegociacao()"
              (goBack)="goToBoard()"
              (saved)="onSaved()"
            />
          }
        }
      </div>
    </div>
  `,
})
export class NegotiationsComponent {
  viewMode = signal<ViewMode>('board');
  selectedNegociacao = signal<Negociacao | null>(null);

  onCreateNew() {
    this.selectedNegociacao.set(null);
    this.viewMode.set('form');
  }

  onEdit(negociacao: Negociacao) {
    this.selectedNegociacao.set(negociacao);
    this.viewMode.set('form');
  }

  onSaved() {
    this.goToBoard();
  }

  goToBoard() {
    this.viewMode.set('board');
    this.selectedNegociacao.set(null);
  }
}
