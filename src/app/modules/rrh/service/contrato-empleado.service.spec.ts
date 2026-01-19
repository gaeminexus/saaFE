import { TestBed } from '@angular/core/testing';

import { ContratoEmpleadoService } from './contrato-empleado.service';

describe('ContratoEmpleadoService', () => {
  let service: ContratoEmpleadoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ContratoEmpleadoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
