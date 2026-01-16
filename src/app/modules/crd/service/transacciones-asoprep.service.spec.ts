import { TestBed } from '@angular/core/testing';

import { TransaccionesAsoprepService } from './transacciones-asoprep.service';

describe('TransaccionesAsoprepService', () => {
  let service: TransaccionesAsoprepService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TransaccionesAsoprepService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
