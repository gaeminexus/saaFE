import { TestBed } from '@angular/core/testing';

import { CesantiaService } from './cesantia.service';

describe('CesantiaService', () => {
  let service: CesantiaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CesantiaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
