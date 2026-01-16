import { TestBed } from '@angular/core/testing';

import { SaldosService } from './saldos.service';

describe('SaldosService', () => {
  let service: SaldosService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SaldosService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
