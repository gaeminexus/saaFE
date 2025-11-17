import { TestBed } from '@angular/core/testing';

import { EstadoCesantiaService } from './estado-cesantia.service';

describe('EstadoCesantiaService', () => {
  let service: EstadoCesantiaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EstadoCesantiaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
