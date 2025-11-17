import { TestBed } from '@angular/core/testing';

import { TipoAsientoService } from './tipo-asiento.service';

describe('TipoAsientoService', () => {
  let service: TipoAsientoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TipoAsientoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
