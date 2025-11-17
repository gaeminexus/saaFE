import { TestBed } from '@angular/core/testing';

import { HistMayorizacionService } from './hist-mayorizacion.service';

describe('HistMayorizacionService', () => {
  let service: HistMayorizacionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HistMayorizacionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
