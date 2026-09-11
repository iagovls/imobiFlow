import { TestBed } from '@angular/core/testing';

import { VisitsService } from './visits.service';

function mockGet(service: VisitsService, result: { data: unknown; error: { message: string } | null }) {
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
  service: VisitsService,
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

describe('VisitsService', () => {
  let service: VisitsService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [VisitsService] });
    service = TestBed.inject(VisitsService);
  });

  it('getVisitas retorna [] quando o Supabase retorna erro', async () => {
    mockGet(service, { data: null, error: { message: 'boom' } });
    expect(await service.getVisitas()).toEqual([]);
  });

  it('getVisitas retorna as linhas quando não há erro', async () => {
    const rows = [{ id: 1, status: 'agendada' }];
    mockGet(service, { data: rows, error: null });
    expect(await service.getVisitas()).toEqual(rows);
  });

  it('updateStatus manda o novo status e updated_at no payload', async () => {
    const captured: { payload?: unknown } = {};
    mockUpdate(service, { data: { id: 1, status: 'realizada' }, error: null }, captured);

    const result = await service.updateStatus(1, 'realizada');

    expect(result).toEqual({ id: 1, status: 'realizada' });
    expect(captured.payload).toMatchObject({ status: 'realizada' });
    expect((captured.payload as { updated_at: string }).updated_at).toBeTruthy();
  });

  it('updateStatus retorna null quando o Supabase retorna erro', async () => {
    const captured: { payload?: unknown } = {};
    mockUpdate(service, { data: null, error: { message: 'boom' } }, captured);
    expect(await service.updateStatus(1, 'cancelada')).toBeNull();
  });
});
