import { TestBed } from '@angular/core/testing';

import { ListadosCrdResolverService } from './listados-crd-resolver.service';

describe('ListadosCrdResolverService', () => {
  let service: ListadosCrdResolverService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ListadosCrdResolverService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
