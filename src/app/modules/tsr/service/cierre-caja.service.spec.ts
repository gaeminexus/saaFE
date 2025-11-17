import { TestBed } from '@angular/core/testing';

import { CierreCajaService } from './cierre-caja.service';

describe('CierreCajaService', () => {
  let service: CierreCajaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CierreCajaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
