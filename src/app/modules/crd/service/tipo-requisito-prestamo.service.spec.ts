import { TestBed } from '@angular/core/testing';

import { TipoRequisitoPrestamoService } from './tipo-requisito-prestamo.service';

describe('TipoRequisitoPrestamoService', () => {
  let service: TipoRequisitoPrestamoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TipoRequisitoPrestamoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
