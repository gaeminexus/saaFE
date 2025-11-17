import { TestBed } from '@angular/core/testing';

import { ChequeraService } from './chequera.service';

describe('ChequeraService', () => {
  let service: ChequeraService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChequeraService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
