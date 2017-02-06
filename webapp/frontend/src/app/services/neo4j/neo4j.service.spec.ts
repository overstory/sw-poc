/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { Neo4jService } from './neo4j.service';

describe('Neo4jService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [Neo4jService]
    });
  });

  it('should ...', inject([Neo4jService], (service: Neo4jService) => {
    expect(service).toBeTruthy();
  }));
});
