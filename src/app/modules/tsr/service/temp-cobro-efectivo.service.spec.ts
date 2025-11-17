import { TestBed } from '@angular/core/testing';

import { TempCobroEfectivoService } from './temp-cobro-efectivo.service';

describe('TempCobroEfectivoService', () => {
  let service: TempCobroEfectivoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TempCobroEfectivoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
