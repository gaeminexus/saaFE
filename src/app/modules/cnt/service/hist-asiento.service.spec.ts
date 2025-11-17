import { TestBed } from '@angular/core/testing';

import { HistAsientoService } from './hist-asiento.service';

describe('HistAsientoService', () => {
  let service: HistAsientoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HistAsientoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
