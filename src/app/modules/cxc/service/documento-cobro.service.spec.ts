import { TestBed } from '@angular/core/testing';

import { DocumentoCobroService } from './documento-cobro.service';

describe('DocumentoCobroService', () => {
  let service: DocumentoCobroService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DocumentoCobroService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
