import { TestBed } from '@angular/core/testing';

import { CobroService } from './cobro.service';

describe('CobroService', () => {
  let service: CobroService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CobroService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
