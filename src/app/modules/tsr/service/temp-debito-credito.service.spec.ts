import { TestBed } from '@angular/core/testing';

import { TempDebitoCreditoService } from './temp-debito-credito.service';

describe('TempDebitoCreditoService', () => {
  let service: TempDebitoCreditoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TempDebitoCreditoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
