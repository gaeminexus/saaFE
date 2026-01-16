import { TestBed } from '@angular/core/testing';

import { RubroService } from './rubro.service';

describe('RubroService', () => {
  let service: RubroService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RubroService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
