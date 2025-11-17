import { TestBed } from '@angular/core/testing';

import { AuxDepositoBancoService } from './aux-deposito-banco.service';

describe('AuxDepositoBancoService', () => {
  let service: AuxDepositoBancoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuxDepositoBancoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
