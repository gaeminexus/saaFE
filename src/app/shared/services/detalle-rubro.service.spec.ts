import { TestBed } from '@angular/core/testing';

import { DetalleRubroService } from './detalle-rubro.service';

describe('DetalleRubroService', () => {
  let service: DetalleRubroService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DetalleRubroService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
