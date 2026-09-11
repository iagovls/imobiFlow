import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { LogoComponent } from '../logo-component/logo-component';

@Component({
  selector: 'app-reset-password-component',
  imports: [FormsModule, RouterLink, LogoComponent],
  templateUrl: './reset-password-component.html',
  styleUrl: './reset-password-component.css',
})
export class ResetPasswordComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  password = '';
  confirmPassword = '';
  error = signal('');
  loading = signal(false);

  async onSubmit(): Promise<void> {
    this.error.set('');

    if (this.password !== this.confirmPassword) {
      this.error.set('As senhas não coincidem.');
      return;
    }

    if (this.password.length < 6) {
      this.error.set('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    this.loading.set(true);

    const result = await this.authService.updatePassword(this.password);

    if (result.error) {
      this.error.set(result.error);
      this.loading.set(false);
      return;
    }

    this.router.navigate(['/dashboard']);
  }
}
