import { TestBed } from '@angular/core/testing';

import { DepartementoCargoService } from './departemento-cargo.service';

describe('DepartementoCargoService', () => {
  let service: DepartementoCargoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DepartementoCargoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
