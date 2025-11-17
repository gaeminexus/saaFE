import { TestBed } from '@angular/core/testing';

import { DetalleMayorizacionCcService } from './detalle-mayorizacion-cc.service';

describe('DetalleMayorizacionCcService', () => {
  let service: DetalleMayorizacionCcService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DetalleMayorizacionCcService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
