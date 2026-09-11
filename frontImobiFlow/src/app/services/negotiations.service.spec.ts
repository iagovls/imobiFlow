import { TestBed } from '@angular/core/testing';

import { NegotiationsService } from './negotiations.service';

function mockGet(service: NegotiationsService, result: { data: unknown; error: { message: string } | null }) {
  (service as unknown as { supabase: unknown }).supabase = {
    schema: () => ({
      from: () => ({
        select: () => ({
          order: () => Promise.resolve(result),
        }),
      }),
    }),
  };
}

function mockUpdate(
  service: NegotiationsService,
  result: { data: unknown; error: { message: string } | null },
  captured: { payload?: unknown },
) {
  (service as unknown as { supabase: unknown }).supabase = {
    schema: () => ({
      from: () => ({
        update: (payload: unknown) => {
          captured.payload = payload;
          return {
            eq: () => ({
              select: () => ({
                maybeSingle: () => Promise.resolve(result),
              }),
            }),
          };
        },
      }),
    }),
  };
}

describe('NegotiationsService', () => {
  let service: NegotiationsService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [NegotiationsService] });
    service = TestBed.inject(NegotiationsService);
  });

  it('getNegociacoes retorna [] quando o Supabase retorna erro', async () => {
    mockGet(service, { data: null, error: { message: 'boom' } });
    expect(await service.getNegociacoes()).toEqual([]);
  });

  it('getNegociacoes retorna as linhas quando não há erro', async () => {
    const rows = [{ id: 1, etapa: 'novo' }];
    mockGet(service, { data: rows, error: null });
    expect(await service.getNegociacoes()).toEqual(rows);
  });

  it('updateEtapa manda a nova etapa e updated_at no payload', async () => {
    const captured: { payload?: unknown } = {};
    mockUpdate(service, { data: { id: 1, etapa: 'proposta' }, error: null }, captured);

    const result = await service.updateEtapa(1, 'proposta');

    expect(result).toEqual({ id: 1, etapa: 'proposta' });
    expect(captured.payload).toMatchObject({ etapa: 'proposta' });
    expect((captured.payload as { updated_at: string }).updated_at).toBeTruthy();
  });

  it('updateEtapa retorna null quando o Supabase retorna erro', async () => {
    const captured: { payload?: unknown } = {};
    mockUpdate(service, { data: null, error: { message: 'boom' } }, captured);
    expect(await service.updateEtapa(1, 'perdido')).toBeNull();
  });
});
