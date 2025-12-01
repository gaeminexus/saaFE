import { TestBed } from '@angular/core/testing';

import { GrupoProductoCobroService } from './grupo-producto-cobro.service';

describe('GrupoProductoCobroService', () => {
  let service: GrupoProductoCobroService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GrupoProductoCobroService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
