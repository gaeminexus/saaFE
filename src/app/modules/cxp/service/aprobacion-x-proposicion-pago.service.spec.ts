import { TestBed } from '@angular/core/testing';

import { AprobacionXProposicionPagoService } from './aprobacion-x-proposicion-pago.service';

describe('AprobacionXProposicionPagoService', () => {
  let service: AprobacionXProposicionPagoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AprobacionXProposicionPagoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
