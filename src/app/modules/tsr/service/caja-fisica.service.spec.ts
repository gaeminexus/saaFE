import { TestBed } from '@angular/core/testing';

import { CajaFisicaService } from './caja-fisica.service';

describe('CajaFisicaService', () => {
  let service: CajaFisicaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CajaFisicaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
