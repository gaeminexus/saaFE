import { TestBed } from '@angular/core/testing';

import { CuentaBancariaService } from './cuenta-bancaria.service';

describe('CuentaBancariaService', () => {
  let service: CuentaBancariaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CuentaBancariaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
