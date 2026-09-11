import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  start: string | null;
  end: string | null;
  htmlLink: string | null;
  attendees: string[];
}

interface GoogleEventsResponse {
  connected: boolean;
  events: GoogleCalendarEvent[];
  error?: string;
}

interface GoogleCalendarEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseSchema: string;
  s3ApiBaseUrl?: string;
  googleCalendarClientId?: string;
}

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

@Injectable({
  providedIn: 'root',
})
export class GoogleCalendarService {
  private readonly env: GoogleCalendarEnv = environment as unknown as GoogleCalendarEnv;
  private readonly API_BASE_URL: string;
  private readonly supabase: SupabaseClient;

  constructor(private http: HttpClient) {
    this.API_BASE_URL = this.env.s3ApiBaseUrl ?? `${this.env.supabaseUrl}/functions/v1`;
    this.supabase = createClient(this.env.supabaseUrl, this.env.supabaseAnonKey);
  }

  private withSchema() {
    return (this.supabase as unknown as { schema: (s: string) => SupabaseClient }).schema('pierre');
  }

  async isConnected(): Promise<boolean> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await this.withSchema()
      .from('google_calendar_tokens')
      .select('corretor_id')
      .eq('corretor_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('[GoogleCalendarService] Erro ao checar conexão:', error.message);
      return false;
    }

    return !!data;
  }

  async connect(): Promise<void> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) return;

    const state = btoa(
      JSON.stringify({
        corretor_id: user.id,
        return_to: `${window.location.origin}/agenda`,
      }),
    )
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    const redirectUri = `${this.env.supabaseUrl}/functions/v1/google-calendar-oauth-callback`;

    const params = new URLSearchParams({
      client_id: this.env.googleCalendarClientId ?? '',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: GOOGLE_CALENDAR_SCOPE,
      access_type: 'offline',
      prompt: 'consent',
      state,
    });

    window.location.href = `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  async getEvents(): Promise<GoogleEventsResponse> {
    try {
      const url = `${this.API_BASE_URL}/get-google-calendar-events`;
      return await firstValueFrom(
        this.http.get<GoogleEventsResponse>(url, { headers: await this.buildAuthHeaders() }),
      );
    } catch (err) {
      console.error('[GoogleCalendarService] Erro ao buscar eventos:', err);
      return { connected: false, events: [] };
    }
  }

  private async buildAuthHeaders(): Promise<HttpHeaders> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      apikey: this.env.supabaseAnonKey,
    });

    try {
      const { data } = await this.supabase.auth.getSession();
      const token = data.session?.access_token;
      headers = headers.set('Authorization', `Bearer ${token ?? this.env.supabaseAnonKey}`);
    } catch {
      headers = headers.set('Authorization', `Bearer ${this.env.supabaseAnonKey}`);
    }
    return headers;
  }
}
