import { TestBed } from '@angular/core/testing';

import { AdjuntoService } from './adjunto.service';

describe('AdjuntoService', () => {
  let service: AdjuntoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AdjuntoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
