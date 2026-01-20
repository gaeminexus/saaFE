import { TestBed } from '@angular/core/testing';

import { ResumenNominaService } from './resumen-nomina.service';

describe('ResumenNominaService', () => {
  let service: ResumenNominaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ResumenNominaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
