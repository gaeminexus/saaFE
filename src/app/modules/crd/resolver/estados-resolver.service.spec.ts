import { TestBed } from '@angular/core/testing';

import { EstadosResolverService } from './estados-resolver.service';

describe('EstadosResolverService', () => {
  let service: EstadosResolverService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EstadosResolverService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
