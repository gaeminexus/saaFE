import { TestBed } from '@angular/core/testing';

import { AuxDepositoDesgloseService } from './aux-deposito-desglose.service';

describe('AuxDepositoDesgloseService', () => {
  let service: AuxDepositoDesgloseService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuxDepositoDesgloseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
