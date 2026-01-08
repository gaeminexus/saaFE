import { TestBed } from '@angular/core/testing';

import { ComposicionCuotaInicialPagoService } from './composicion-cuota-inicial-pago.service';

describe('ComposicionCuotaInicialPagoService', () => {
  let service: ComposicionCuotaInicialPagoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ComposicionCuotaInicialPagoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
