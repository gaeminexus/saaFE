import { TestBed } from '@angular/core/testing';

import { DebitoCreditoService } from './debito-credito.service';

describe('DebitoCreditoService', () => {
  let service: DebitoCreditoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DebitoCreditoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
