import { TestBed } from '@angular/core/testing';

import { PersonaNaturalTsService } from './persona-natural.ts.service';

describe('PersonaNaturalTsService', () => {
  let service: PersonaNaturalTsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PersonaNaturalTsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
