import { Component, inject, Input } from '@angular/core';
import { LucideTarget } from '@lucide/angular';
import { isActive, Router } from '@angular/router';

@Component({
  selector: 'app-target-icon-component',
  imports: [LucideTarget],
  template: `
    @if (isMetasActive()) {
    <svg lucideTarget [size]="size * 4" [strokeWidth]="2"></svg>
  } @else {
    <svg lucideTarget [size]="size * 4" [strokeWidth]="1.5"></svg>
  }
  `,
  styleUrl: './target-icon-component.css',
})
export class TargetIconComponent {
  private router = inject(Router);
  @Input() size: number = 6;
  isMetasActive = isActive('/metas', this.router);
}
