import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { LogoComponent } from '../logo-component/logo-component';

@Component({
  selector: 'app-login-component',
  imports: [FormsModule, RouterLink, LogoComponent],
  templateUrl: './login-component.html',
  styleUrl: './login-component.css',
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  error = signal('');
  loading = signal(false);

  async onSubmit(): Promise<void> {
    this.error.set('');
    this.loading.set(true);

    const result = await this.authService.login(this.email, this.password);

    if (result.error) {
      this.error.set(result.error);
      this.loading.set(false);
      return;
    }

    this.router.navigate(['/dashboard']);
  }
}
