import { TestBed } from '@angular/core/testing';

import { DetalleMayorizacionService } from './detalle-mayorizacion.service';

describe('DetalleMayorizacionService', () => {
  let service: DetalleMayorizacionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DetalleMayorizacionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
