import { TestBed } from '@angular/core/testing';

import { HistDetalleAsientoService } from './hist-detalle-asiento.service';

describe('HistDetalleAsientoService', () => {
  let service: HistDetalleAsientoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HistDetalleAsientoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
