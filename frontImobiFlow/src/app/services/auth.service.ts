import { Injectable, signal, computed } from '@angular/core';
import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

export type UserProfile = {
  id: string;
  displayName: string;
};

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private supabase: SupabaseClient;
  private _user = signal<User | null>(null);
  private _profile = signal<UserProfile | null>(null);
  private _session = signal<Session | null>(null);
  private _loading = signal(true);

  user = this._user.asReadonly();
  profile = this._profile.asReadonly();
  displayName = computed(() => this._profile()?.displayName || '');

  session = this._session.asReadonly();
  loading = this._loading.asReadonly();
  isAuthenticated = computed(() => !!this._user());

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
    this.initSession();
  }



  private async initSession(): Promise<void> {
    const {
      data: { session },
    } = await this.supabase.auth.getSession();
    this._session.set(session);
    this._user.set(session?.user ?? null);
    this._loading.set(false);

    this.supabase.auth.onAuthStateChange(async (_event, session) => {
      this._session.set(session);
      this._user.set(session?.user ?? null);
    });
  }

  async login(email: string, password: string): Promise<{ error?: string }> {
    const { error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.log('login error', error);
      return { error: error.message };
    }

    const appId = this._user()?.app_metadata?.['app_id'];

    if (appId != 'imobiflow') {
      console.log(appId);
      await this.logout();
      return { error: 'Usuário sem perfil associado' };
    }
    return {};
  }

  async logout(): Promise<void> {
    await this.supabase.auth.signOut();
  }

  async resetPassword(email: string): Promise<{ error?: string }> {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    if (error) {
      return { error: error.message };
    }
    return {};
  }

  async updatePassword(newPassword: string): Promise<{ error?: string }> {
    const { error } = await this.supabase.auth.updateUser({ password: newPassword });
    if (error) {
      return { error: error.message };
    }
    return {};
  }

  async getUserEmail(): Promise<string> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    return user?.email ?? '';
  }
}


