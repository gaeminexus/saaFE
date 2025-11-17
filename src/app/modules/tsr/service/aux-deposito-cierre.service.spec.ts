import { TestBed } from '@angular/core/testing';

import { AuxDepositoCierreService } from './aux-deposito-cierre.service';

describe('AuxDepositoCierreService', () => {
  let service: AuxDepositoCierreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuxDepositoCierreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
