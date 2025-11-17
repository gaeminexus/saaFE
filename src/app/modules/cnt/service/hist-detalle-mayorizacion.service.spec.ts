import { TestBed } from '@angular/core/testing';

import { HistDetalleMayorizacionService } from './hist-detalle-mayorizacion.service';

describe('HistDetalleMayorizacionService', () => {
  let service: HistDetalleMayorizacionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HistDetalleMayorizacionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
