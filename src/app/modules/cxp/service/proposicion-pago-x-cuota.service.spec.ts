import { TestBed } from '@angular/core/testing';

import { ProposicionPagoXCuotaService } from './proposicion-pago-x-cuota.service';

describe('ProposicionPagoXCuotaService', () => {
  let service: ProposicionPagoXCuotaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProposicionPagoXCuotaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
