import { Routes } from '@angular/router';
import { authGuard, publicGuard } from './guards/auth.guard';
import { LeadsComponent } from './components/leads/leads-component/leads-component';
import { NegotiationsComponent } from './components/negotiations-component/negotiations-component';
import { CalendarComponent } from './components/calendar-component/calendar-component';
import { LoginComponent } from './components/login-component/login-component';
import { RecoveryComponent } from './components/recovery-component/recovery-component';
import { ResetPasswordComponent } from './components/reset-password-component/reset-password-component';
import { AccountComponent } from './components/account-component/account-component';
import { PropertiesComponent } from './components/properties/properties-component/properties-component';
import { DashboardComponent } from './components/dashboard/dashboard-component/dashboard-component';
import { MetasComponent } from './components/metas/metas-component/metas-component';

export const routes: Routes = [
    {path: 'login', component: LoginComponent, title: 'Login', canActivate: [publicGuard]},
    {path: 'esqueci-senha', component: RecoveryComponent, title: 'Esqueci a senha', canActivate: [publicGuard]},
    {path: 'redefinir-senha', component: ResetPasswordComponent, title: 'Redefinir senha', canActivate: [publicGuard]},

    {path: 'dashboard', component: DashboardComponent, title: 'Dashboard', canActivate: [authGuard]},
    {path: 'leads', component: LeadsComponent, title: 'Leads', canActivate: [authGuard]},
    {path: 'imoveis', component: PropertiesComponent, title: 'Imóveis', canActivate: [authGuard]},
    {path: 'agenda', component: CalendarComponent, title: 'Agenda', canActivate: [authGuard]},
    {path: 'negociacoes', component: NegotiationsComponent, title: 'Negociações', canActivate: [authGuard]},
    {path: 'metas', component: MetasComponent, title: 'Metas', canActivate: [authGuard]},
    {path: 'perfil', component: AccountComponent, title: 'Meu Perfil', canActivate: [authGuard]},

    {path: '', redirectTo: 'dashboard', pathMatch: 'full'},
    {path: '**', redirectTo: 'dashboard', pathMatch: 'full'}
];
