import { TestBed } from '@angular/core/testing';

import { GrupoCajaService } from './grupo-caja.service';

describe('GrupoCajaService', () => {
  let service: GrupoCajaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GrupoCajaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
