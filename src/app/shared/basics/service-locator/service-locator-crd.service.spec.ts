import { TestBed } from '@angular/core/testing';

import { ServiceLocatorCrdService } from './service-locator-crd.service';

describe('ServiceLocatorCrdService', () => {
  let service: ServiceLocatorCrdService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ServiceLocatorCrdService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
