import { TestBed } from '@angular/core/testing';

import { ExterService } from './exter.service';

describe('ExterService', () => {
  let service: ExterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExterService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
