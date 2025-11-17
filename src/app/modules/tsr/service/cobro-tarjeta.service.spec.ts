import { TestBed } from '@angular/core/testing';

import { CobroTarjetaService } from './cobro-tarjeta.service';

describe('CobroTarjetaService', () => {
  let service: CobroTarjetaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CobroTarjetaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
