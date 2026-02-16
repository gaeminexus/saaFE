import { TestBed } from '@angular/core/testing';

import { TipoContratoEmpleadoService } from './tipo-contrato-empleado.service';

describe('TipoContratoEmpleadoService', () => {
  let service: TipoContratoEmpleadoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TipoContratoEmpleadoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
