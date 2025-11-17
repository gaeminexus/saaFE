import { TestBed } from '@angular/core/testing';

import { FuncionesDatosService } from './funciones-datos.service';

describe('FuncionesDatosService', () => {
  let service: FuncionesDatosService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FuncionesDatosService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
