import { Injectable } from '@angular/core';
import { Http, Headers, RequestOptions } from '@angular/http';
import { Observable } from "rxjs";

@Injectable()
export class GraphService {
  private defaultOptions: RequestOptions;
  private settings =  {
    endpoint: 'http://localhost:5050/graph/query/id/'
  };


  constructor(
    private http: Http
  ) { }


  getQueryResults (query:string): Observable<any> {
    let url = this.settings.endpoint + query;
    return this.http.get (url)
      .map(res => {
        let results = res.json().data;
        let output = {
          nodes: [],
          links: []
        };

        for (var i = 0; i < results.nodes.length; i++) {

          var checkExists: boolean = false;
          var currentSize: number = output.nodes.length;
          for (var k = 0; k < currentSize; k++) {
            if (results.nodes[i].id === output.nodes[k].id) {
              checkExists = true;
            }
          }
          if (checkExists != true) {
            output.nodes.push({
              id: results.nodes[i].id,
              name: results.nodes[i].label,
              //group: nodes[i].labels[0], //todo: fix this and use more groups
              //img: (nodes[i].properties.movieDbImage == null) ? null : this.settings.moviedbBaseUrl + nodes[i].properties.movieDbImage,
              //biography: (nodes[i].properties.biography == null) ? "Default bio" : nodes[i].properties.biography
              url: results.nodes[i].url
            });
          }
        }

        for (var i = 0; i < results.edges.length; i++) {

          var checkExists: boolean = false;
          var currentSize: number = output.links.length;
          for (var k = 0; k < currentSize; k++) {
            if (results.edges[i].id === output.links[k].id) {
              checkExists = true;
            }
          }
          // if (checkExists != true) {
          output.links.push({
            source: results.edges[i].from,
            target: results.edges[i].to,
            strength: 1,
            arrows: results.edges[i].arrows,
            relationship: results.edges[i].label
          });
          //}
        }
        return output;
      })
      .catch((error:any) => Observable.throw(error.json().error || 'Server error'));
  }

}
