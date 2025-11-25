import { TestBed } from '@angular/core/testing';

import { CxcParticipeService } from './cxc-participe.service';

describe('CxcParticipeService', () => {
  let service: CxcParticipeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CxcParticipeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
