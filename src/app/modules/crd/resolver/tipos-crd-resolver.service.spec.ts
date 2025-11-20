import { TestBed } from '@angular/core/testing';

import { TiposCrdResolverService } from './tipos-crd-resolver.service';

describe('TiposCrdResolverService', () => {
  let service: TiposCrdResolverService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TiposCrdResolverService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
