import { Component, signal } from '@angular/core';
import { AgendaCalendarComponent } from '../agenda/agenda-calendar/agenda-calendar';
import { VisitFormComponent } from '../agenda/visit-form/visit-form';
import { Visita } from '../../services/visits.service';

type ViewMode = 'calendar' | 'form';

@Component({
  selector: 'app-calendar-component',
  imports: [AgendaCalendarComponent, VisitFormComponent],
  template: `
    <div class="flex w-full h-full min-h-0 overflow-hidden">
      <div class="w-full h-full min-w-0 min-h-0 flex flex-col">
        @switch (viewMode()) {
          @case ('calendar') {
            <app-agenda-calendar
              class="flex-1 min-h-0 w-full flex flex-col"
              (createNew)="onCreateNew()"
              (edit)="onEdit($event)"
            />
          }
          @case ('form') {
            <app-visit-form
              class="flex-1 min-h-0 w-full flex flex-col"
              [visita]="selectedVisita()"
              (goBack)="goToCalendar()"
              (saved)="onSaved()"
            />
          }
        }
      </div>
    </div>
  `,
})
export class CalendarComponent {
  viewMode = signal<ViewMode>('calendar');
  selectedVisita = signal<Visita | null>(null);

  onCreateNew() {
    this.selectedVisita.set(null);
    this.viewMode.set('form');
  }

  onEdit(visita: Visita) {
    this.selectedVisita.set(visita);
    this.viewMode.set('form');
  }

  onSaved() {
    this.goToCalendar();
  }

  goToCalendar() {
    this.viewMode.set('calendar');
    this.selectedVisita.set(null);
  }
}
