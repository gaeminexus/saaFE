import { TestBed } from '@angular/core/testing';

import { ArchivoPetroService } from './archivo-petro.service';

describe('ArchivoPetroService', () => {
  let service: ArchivoPetroService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ArchivoPetroService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
