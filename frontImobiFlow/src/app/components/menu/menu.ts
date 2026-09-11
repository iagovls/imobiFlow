import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { LogoComponent } from "../logo-component/logo-component";
import { NgComponentOutlet, UpperCasePipe } from '@angular/common';
import { MenuService } from '../../services/menu-service';
import { RouterLink } from "@angular/router";
import { AccountIcon } from '../icons/account-icon/account-icon';
import { AuthService } from '../../services/auth.service';
import { Goal } from '../goal/goal';
import { PropertiesService } from '../../services/properties.service';
import { VisitsService } from '../../services/visits.service';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [LogoComponent, NgComponentOutlet, RouterLink, AccountIcon, UpperCasePipe, Goal],
  templateUrl: './menu.html',
  styleUrl: './menu.css',
})
export class Menu implements OnInit {
  public menuService = inject(MenuService);
  public authService = inject(AuthService);
  private propertiesService = inject(PropertiesService);
  private visitsService = inject(VisitsService);
  public accountIcon = AccountIcon;
  public userName = computed(() => {
    const user = this.authService.user();
    return user?.user_metadata?.['name'] ?? 'Usuário';
  });

  style = 'md:p-2 md:bg-verde-200 md:rounded-md md:border md:shadow md:border-emerald-500';

  corretor = "Corretor"

  imoveisAtivos = signal(0);
  visitasSemana = signal(0);

  async ngOnInit() {
    const [imoveis, visitas] = await Promise.all([
      this.propertiesService.getImoveis(true),
      this.visitsService.getVisitas(),
    ]);
    this.imoveisAtivos.set(imoveis.length);

    const agora = Date.now();
    const em7dias = agora + 7 * 24 * 60 * 60 * 1000;
    this.visitasSemana.set(
      visitas.filter((v) => {
        const t = new Date(v.data_hora).getTime();
        return v.status !== 'cancelada' && t >= agora && t <= em7dias;
      }).length,
    );
  }
}
