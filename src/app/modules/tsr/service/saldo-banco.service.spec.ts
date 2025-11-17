import { TestBed } from '@angular/core/testing';

import { SaldoBancoService } from './saldo-banco.service';

describe('SaldoBancoService', () => {
  let service: SaldoBancoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SaldoBancoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
