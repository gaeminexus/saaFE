import { TestBed } from '@angular/core/testing';

import { TempComposicionCuotaInicialCobroService } from './temp-composicion-cuota-inicial-cobro.service';

describe('TempComposicionCuotaInicialCobroService', () => {
  let service: TempComposicionCuotaInicialCobroService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TempComposicionCuotaInicialCobroService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
