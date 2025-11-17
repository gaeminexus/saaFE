import { TestBed } from '@angular/core/testing';

import { TempCobroChequeService } from './temp-cobro-cheque.service';

describe('TempCobroChequeService', () => {
  let service: TempCobroChequeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TempCobroChequeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
