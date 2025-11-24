import { TestBed } from '@angular/core/testing';

import { ServiciosAsoprepService } from './servicios-asoprep.service';

describe('ServiciosAsoprepService', () => {
  let service: ServiciosAsoprepService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ServiciosAsoprepService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
