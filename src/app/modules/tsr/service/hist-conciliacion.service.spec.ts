import { TestBed } from '@angular/core/testing';

import { HistConciliacionService } from './hist-conciliacion.service';

describe('HistConciliacionService', () => {
  let service: HistConciliacionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HistConciliacionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
