import { TestBed } from '@angular/core/testing';

import { CxcKardexParticipeService } from './cxc-kardex-participe.service';

describe('CxcKardexParticipeService', () => {
  let service: CxcKardexParticipeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CxcKardexParticipeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
