import { TestBed } from '@angular/core/testing';

import { ParroquiaService } from './parroquia.service';

describe('ParroquiaService', () => {
  let service: ParroquiaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ParroquiaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
