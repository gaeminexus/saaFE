import { TestBed } from '@angular/core/testing';

import { TempCobroTarjetaService } from './temp-cobro-tarjeta.service';

describe('TempCobroTarjetaService', () => {
  let service: TempCobroTarjetaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TempCobroTarjetaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
