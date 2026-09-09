import { Component, inject, computed } from '@angular/core';
import { LogoComponent } from "../logo-component/logo-component";
import { NgComponentOutlet, UpperCasePipe } from '@angular/common';
import { MenuService } from '../../services/menu-service';
import { RouterLink } from "@angular/router";
import { AccountIcon } from '../icons/account-icon/account-icon';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [LogoComponent, NgComponentOutlet, RouterLink, AccountIcon, UpperCasePipe],
  templateUrl: './menu.html',
  styleUrl: './menu.css',
})
export class Menu {
  public menuService = inject(MenuService);
  public authService = inject(AuthService);
  public accountIcon = AccountIcon;
  public userName = computed(() => {
    const user = this.authService.user();
    return user?.user_metadata?.['name'] ?? 'Usuário';
  });

  style = 'md:p-2 md:bg-verde-200 md:rounded-md md:border md:shadow md:border-emerald-500';

  corretor = "Corretor"

}
