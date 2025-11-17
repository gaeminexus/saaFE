import { TestBed } from '@angular/core/testing';

import { CajaLogicaService } from './caja-logica.service';

describe('CajaLogicaService', () => {
  let service: CajaLogicaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CajaLogicaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
