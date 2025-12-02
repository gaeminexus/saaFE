import { TestBed } from '@angular/core/testing';

import { ProductoCobroService } from './producto-cobro.service';

describe('ProductoCobroService', () => {
  let service: ProductoCobroService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProductoCobroService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
