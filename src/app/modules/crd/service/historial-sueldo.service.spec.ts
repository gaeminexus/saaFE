import { TestBed } from '@angular/core/testing';

import { HistorialSueldoService } from './historial-sueldo.service';

describe('HistorialSueldoService', () => {
  let service: HistorialSueldoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HistorialSueldoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
