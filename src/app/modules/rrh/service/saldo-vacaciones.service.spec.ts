import { TestBed } from '@angular/core/testing';

import { SaldoVacacionesService } from './saldo-vacaciones.service';

describe('SaldoVacacionesService', () => {
  let service: SaldoVacacionesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SaldoVacacionesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
