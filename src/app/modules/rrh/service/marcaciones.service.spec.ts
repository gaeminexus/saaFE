import { TestBed } from '@angular/core/testing';

import { MarcacionesService } from './marcaciones.service';

describe('MarcacionesService', () => {
  let service: MarcacionesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MarcacionesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
