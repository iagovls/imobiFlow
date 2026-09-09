import { TestBed } from '@angular/core/testing';

import { PropertiesService } from './properties.service';
import { S3Service } from './s3.service';

function mockRows(service: PropertiesService, rows: Array<{ imv_codigo: string | null }>) {
  (service as unknown as { supabase: unknown }).supabase = {
    schema: () => ({
      from: () => ({
        select: () => Promise.resolve({ data: rows, error: null }),
      }),
    }),
  };
}

describe('PropertiesService.getNextCodigo', () => {
  let service: PropertiesService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PropertiesService, { provide: S3Service, useValue: {} }],
    });
    service = TestBed.inject(PropertiesService);
  });

  it('retorna IMV-001 quando não há imóveis', async () => {
    mockRows(service, []);
    expect(await service.getNextCodigo()).toBe('IMV-001');
  });

  it('usa o maior número + 1, com zero-padding de 3 dígitos', async () => {
    mockRows(service, [{ imv_codigo: 'IMV-001' }, { imv_codigo: 'IMV-009' }, { imv_codigo: 'IMV-004' }]);
    expect(await service.getNextCodigo()).toBe('IMV-010');
  });

  it('ignora códigos fora do padrão IMV-<números>', async () => {
    mockRows(service, [
      { imv_codigo: 'IMV-002' },
      { imv_codigo: 'ABC-100' },
      { imv_codigo: null },
      { imv_codigo: 'IMV-abc' },
    ]);
    expect(await service.getNextCodigo()).toBe('IMV-003');
  });

  it('não faz padding quando o próximo número tem 3+ dígitos', async () => {
    mockRows(service, [{ imv_codigo: 'IMV-150' }]);
    expect(await service.getNextCodigo()).toBe('IMV-151');
  });
});
