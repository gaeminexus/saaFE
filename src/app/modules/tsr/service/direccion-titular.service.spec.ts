import { TestBed } from '@angular/core/testing';

import { DireccionTitularService } from './direccion-titular.service';

describe('DireccionTitularService', () => {
  let service: DireccionTitularService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DireccionTitularService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
