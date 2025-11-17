import { TestBed } from '@angular/core/testing';

import { NaturalezaCuentaService } from './naturaleza-cuenta.service';

describe('NaturalezaCuentaService', () => {
  let service: NaturalezaCuentaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NaturalezaCuentaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
