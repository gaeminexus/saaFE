import { TestBed } from '@angular/core/testing';

import { TempCobroRetencionService } from './temp-cobro-retencion.service';

describe('TempCobroRetencionService', () => {
  let service: TempCobroRetencionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TempCobroRetencionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
