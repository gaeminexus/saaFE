import { TestBed } from '@angular/core/testing';

import { TempCobroService } from './temp-cobro.service';

describe('TempCobroService', () => {
  let service: TempCobroService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TempCobroService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
