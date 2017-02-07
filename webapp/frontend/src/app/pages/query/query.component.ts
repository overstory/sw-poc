import { Component, OnInit } from '@angular/core';
import { Neo4jService } from "../../services/neo4j/neo4j.service";

@Component({
  selector: 'app-query',
  templateUrl: './query.component.html',
  styleUrls: ['./query.component.css'],
  providers: [ Neo4jService ]
})
export class QueryComponent implements OnInit {
  private chartData: Array<any>;

  constructor(
    private neo4j: Neo4jService
  ) { }

  ngOnInit() {
  }

  runNeo()  {
     var query = {
        "statements": [
          {
            "statement": "MATCH (n:Character {name: \"Leia Organa\"})-[p]-()\nRETURN n,p \nLIMIT 250",
            "parameters": null,
            "resultDataContents": [
              "graph"
            ],
            "includeStats": true
          }
        ]
      };

      var query2 = {
        "statements": [
          {
            "statement": "MATCH (n:Character {name: \"Yoda\"})-[p:PORTRAYED_BY]->(Actor)-[a:APPEARS_IN]->(Film)\nRETURN n,p,a \nLIMIT 25",
            "parameters": null,
            "resultDataContents": [
              "graph"
            ],
            "includeStats": true
          }
        ]
      };

      var query3 = {
        "statements": [
          {
            "statement": "MATCH (n)-[r]-() RETURN n,r LIMIT 100",
            "parameters": null,
            "resultDataContents": [
              "graph"
            ],
            "includeStats": true
          }
        ]
      };

      this.neo4j.rawQuery(query3).subscribe(data => this.chartData = data);
  }

}
