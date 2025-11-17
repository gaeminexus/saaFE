import { TestBed } from '@angular/core/testing';

import { PersonaRolService } from './persona-rol.service';

describe('PersonaRolService', () => {
  let service: PersonaRolService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PersonaRolService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
