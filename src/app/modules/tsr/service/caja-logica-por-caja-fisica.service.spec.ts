import { TestBed } from '@angular/core/testing';

import { CajaLogicaPorCajaFisicaService } from './caja-logica-por-caja-fisica.service';

describe('CajaLogicaPorCajaFisicaService', () => {
  let service: CajaLogicaPorCajaFisicaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CajaLogicaPorCajaFisicaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
