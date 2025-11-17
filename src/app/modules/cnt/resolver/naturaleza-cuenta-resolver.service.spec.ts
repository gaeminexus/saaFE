import { TestBed } from '@angular/core/testing';

import { NaturalezaCuentaResolverService } from './naturaleza-cuenta-resolver.service';

describe('NaturalezaCuentaResolverService', () => {
  let service: NaturalezaCuentaResolverService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NaturalezaCuentaResolverService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
