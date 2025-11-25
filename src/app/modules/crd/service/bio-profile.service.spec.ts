import { TestBed } from '@angular/core/testing';

import { BioProfileService } from './bio-profile.service';

describe('BioProfileService', () => {
  let service: BioProfileService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BioProfileService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
