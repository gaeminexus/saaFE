import { TestBed } from '@angular/core/testing';

import { ComposicionCuotaInicialCobroService } from './composicion-cuota-inicial-cobro.service';

describe('ComposicionCuotaInicialCobroService', () => {
  let service: ComposicionCuotaInicialCobroService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ComposicionCuotaInicialCobroService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
