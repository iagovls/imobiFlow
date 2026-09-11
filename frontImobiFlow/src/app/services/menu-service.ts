import { inject, Injectable, signal, Type } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { UsersIcon } from '../components/icons/users-icon/users-icon';
import { DashboardIconComponent } from '../components/icons/dashboard-icon-component/dashboard-icon-component';
import { PropertyIconComponent } from '../components/icons/property-icon-component/property-icon-component';
import { CalendarIconComponent } from '../components/icons/calendar-icon-component/calendar-icon-component';
import { HandshakeIconComponent } from '../components/icons/handshake-icon-component/handshake-icon-component';
import { filter } from 'rxjs';
import { AccountIcon } from '../components/icons/account-icon/account-icon';

@Injectable({
  providedIn: 'root',
})
export class MenuService {
  private router = inject(Router);
  public activeSection = signal('');
  public activeIcon = signal<Type<unknown> | null>(null);
  constructor() {
    this.setActiveSection();

        this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => this.setActiveSection());
  }


  setActiveSection(): void {
    const currentSection = this.sections.find((section) =>
      this.router.url.startsWith(section.link)
    )
    this.activeSection.set(currentSection?.name ?? '')
    this.activeIcon.set(currentSection?.icon ?? null)
  }



  isSectionActive(link: string): boolean {
    return this.router.url.startsWith(link);
  }

  sections: Array<{
    name: string;
    icon: Type<unknown>;
    link: string;
  }> = [
    {
      name: 'Dashboard',
      icon: DashboardIconComponent,
      link: '/dashboard',
    },
    {
      name: 'Leads',
      icon: UsersIcon,
      link: '/leads',
    },
    {
      name: 'Imóveis',
      icon: PropertyIconComponent,
      link: '/imoveis',
    },
    {
      name: 'Agenda',
      icon: CalendarIconComponent,
      link: '/agenda',
    },
    {
      name: 'Negociações',
      icon: HandshakeIconComponent,
      link: '/negociacoes',
    },
    {
      name: 'Perfil',
      icon: AccountIcon,
      link: '/perfil',
    },
  ];
}
