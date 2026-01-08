import { TestBed } from '@angular/core/testing';

import { MontoAprobacionService } from './monto-aprobacion.service';

describe('MontoAprobacionService', () => {
  let service: MontoAprobacionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MontoAprobacionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
