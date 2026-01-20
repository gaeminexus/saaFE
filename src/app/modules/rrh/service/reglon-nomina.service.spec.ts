import { TestBed } from '@angular/core/testing';

import { ReglonNominaService } from './reglon-nomina.service';

describe('ReglonNominaService', () => {
  let service: ReglonNominaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ReglonNominaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
