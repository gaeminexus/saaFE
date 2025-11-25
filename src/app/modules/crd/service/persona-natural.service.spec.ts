import { TestBed } from '@angular/core/testing';
import { PersonaNaturalService } from './persona-natural.service';

describe('PersonaNaturalService', () => {
  let service: PersonaNaturalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PersonaNaturalService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
