import { TestBed } from '@angular/core/testing';

import { CobroChequeService } from './cobro-cheque.service';

describe('CobroChequeService', () => {
  let service: CobroChequeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CobroChequeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
