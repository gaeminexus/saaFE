import { TestBed } from '@angular/core/testing';

import { PersonaCuentaContableService } from './persona-cuenta-contable.service';

describe('PersonaCuentaContableService', () => {
  let service: PersonaCuentaContableService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PersonaCuentaContableService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
