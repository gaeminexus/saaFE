import { TestBed } from '@angular/core/testing';

import { TempComposicionCuotaInicialPagoService } from './temp-composicion-cuota-inicial-pago.service';

describe('TempComposicionCuotaInicialPagoService', () => {
  let service: TempComposicionCuotaInicialPagoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TempComposicionCuotaInicialPagoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
