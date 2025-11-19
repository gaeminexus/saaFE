import { TestBed } from '@angular/core/testing';

import { ProfesionService } from './profesion.service';

describe('ProfesionService', () => {
  let service: ProfesionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProfesionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
