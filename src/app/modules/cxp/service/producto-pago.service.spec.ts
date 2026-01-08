import { TestBed } from '@angular/core/testing';

import { ProductoPagoService } from './producto-pago.service';

describe('ProductoPagoService', () => {
  let service: ProductoPagoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProductoPagoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
