import { TestBed } from '@angular/core/testing';

import { TempMontoAprobacionService } from './temp-monto-aprobacion.service';

describe('TempMontoAprobacionService', () => {
  let service: TempMontoAprobacionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TempMontoAprobacionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
