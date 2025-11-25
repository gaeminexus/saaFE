import { TestBed } from '@angular/core/testing';

import { DocumentoCreditoService } from './documento-credito.service';

describe('DocumentoCreditoService', () => {
  let service: DocumentoCreditoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DocumentoCreditoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
