import { Component, inject, Input } from '@angular/core';
import { LucideLayoutDashboard } from '@lucide/angular';
import { isActive, Router } from '@angular/router';

@Component({
  selector: 'app-dashboard-icon-component',
  imports: [LucideLayoutDashboard],
  template: `
    @if (isDashboardActive()) {
    <svg lucideLayoutDashboard [size]="size * 4" [strokeWidth]="2"></svg>
  } @else {
    <svg lucideLayoutDashboard [size]="size * 4" [strokeWidth]="1.5"></svg>
  }
  `,
  styleUrl: './dashboard-icon-component.css',
})
export class DashboardIconComponent {
  private router = inject(Router);
  @Input() size: number = 6;
  isDashboardActive = isActive('/dashboard', this.router);
}
