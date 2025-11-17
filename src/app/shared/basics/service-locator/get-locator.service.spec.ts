import { TestBed } from '@angular/core/testing';

import { GetLocatorService } from './get-locator.service';

describe('GetLocatorService', () => {
  let service: GetLocatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GetLocatorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
