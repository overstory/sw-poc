import { Injectable } from '@angular/core';
import { Http, Headers, RequestOptions } from '@angular/http';
import { Observable } from "rxjs";

@Injectable()
export class Neo4jService {
  private defaultOptions: RequestOptions;
  private settings =  {
    endpoint: 'http://192.168.99.100:7474/db/data/transaction/commit',
    moviedbBaseUrl: 'http://image.tmdb.org/t/p/w185',
    username: 'neo4j',
    password: 'admin'
  };

  //just an example
  private sampleQuery = {
    "statements": [
      {
        "statement": "MATCH (n:Character {name: \"Nute Gunray\"})-[p:PORTRAYED_BY]->(Actor)-[a:APPEARS_IN]->(Film)\nRETURN n,p,a \nLIMIT 25",
        "parameters": null,
        "resultDataContents": [
          "row",
          "graph"
        ],
        "includeStats": true
      }
    ]
  };

  constructor(
    private http: Http
  ) {
    let headers = new Headers();
    headers.append('Authorization', 'Basic ' + btoa(this.settings.username + ':' + this.settings.password));
    headers.append('Content-Type', 'application/json');
    headers.append('Accept', 'application/json; charset=UTF-8');
    this.defaultOptions = new RequestOptions({
      headers: headers
    });

  }


  // todo separate statement from parameters for more fine-tuned and leaner solution.
  cypher(query: any, params?: any): Observable<any> {
    let body = {
      query: query,
      params: params
    };

    return this.http.post(this.settings.endpoint, JSON.stringify(query), this.defaultOptions)
      .map(res => res.json())
      .catch((error:any) => Observable.throw(error.json().error || 'Server error'));
  }


  rawQuery(body: any): Observable<any> {
     return this.http.post(this.settings.endpoint, JSON.stringify(body), this.defaultOptions)
       .map(res => {
         //outer loop will take d[0] from data
         let results = res.json().results[0];
         let output = {
           nodes: [],
           links: []
         };
         for (var j=0; j < results.data.length; j++ ) {

           let nodes = results.data[j].graph.nodes;
           let relationships = results.data[j].graph.relationships;

           for (var i = 0; i < nodes.length; i++) {

             var checkExists: boolean = false;
             var currentSize: number = output.nodes.length;
             for (var k = 0; k < currentSize; k++) {
               if (nodes[i].id === output.nodes[k].id) {
                 console.log("Node already exists!" + nodes[i].id);
                 checkExists = true;
               }
             }
            if (checkExists != true) {
              output.nodes.push({
                id: nodes[i].id,
                name: nodes[i].properties.name,
                group: nodes[i].labels[0], //todo: fix this and use more groups
                img: (nodes[i].properties.movieDbImage == null) ? null : this.settings.moviedbBaseUrl + nodes[i].properties.movieDbImage,
                biography: (nodes[i].properties.biography == null) ? "Default bio" : nodes[i].properties.biography
              });
            }
           }

           for (var i = 0; i < relationships.length; i++) {

             var checkExists: boolean = false;
             var currentSize: number = output.links.length;
             for (var k = 0; k < currentSize; k++) {
               if (nodes[i].id === output.nodes[k].id) {
                 console.log("Link already exists!" + nodes[i].id);
                 checkExists = true;
               }
             }
          //   if (checkExists != true) {
               output.links.push({
                 source: relationships[i].startNode,
                 target: relationships[i].endNode,
                 strength: 1,
                 relationship: relationships[i].type
               });
             }
          // }
         }
         return output;
       })
      .catch((error:any) => Observable.throw(error.json().error || 'Server error'));
  }

}
