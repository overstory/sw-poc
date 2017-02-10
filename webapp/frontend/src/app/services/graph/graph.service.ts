import { Injectable } from '@angular/core';
import { Http, Headers, RequestOptions } from '@angular/http';
import { Observable, Subject } from "rxjs";

@Injectable()
export class GraphService {
private defaultOptions: RequestOptions;
private settings =  {
endpoint: 'http://localhost:5050/graph/query/id/'
};
private dataSource = new Subject<any>();
private REFERENCED_NODES :string ="referenced-nodes/";

// Observable string streams
dataSourced$ = this.dataSource.asObservable();

constructor(
    private http: Http
  ) { }

  announce(data: any) {
    this.dataSource.next(data);
  }

  getQueryResults (query:string): Observable<any> {
    let url = this.settings.endpoint + query;
    return this.http.get (url)
      .map (res => {
        let results = res.json().network;
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
              group: results.nodes[i].types[0], //todo: fix this and use more groups
              img: (results.nodes[i].depiction == null) ? null : results.nodes[i].depiction,
              description: (results.nodes[i].description == null) ? null : results.nodes[i].description,
              url: results.nodes[i].swapi_url
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
            arrows: results.edges[i].arrows[1],
            relationship: results.edges[i].label
          });
          //}
        }
        return output;
      })
      .catch ( (error:any) => Observable.throw (error.json() || 'Server error'));
  }

  getLabelEntries (label: string) {
    return this.http.get (this.settings.endpoint +'nodes-by-label/' + label)
      .map (res => {
        let results = res.json().network;
        let output :any = { labels: []};
        for (var i = 0; i < results.nodes.length; i++) {
          output.labels.push({
            name: results.nodes[i].label,
            id: results.nodes[i].id
          })
        }
        return output
      })
  }

  //localhost:5050/graph/query/id/referenced-nodes/9112
  getOutboundNodes ( id: number , graph: any): Observable<any> {
    return this.http.get (this.settings.endpoint + this.REFERENCED_NODES + id)
      .map (res => {
        let results = res.json().network;

        for (var i = 0; i < results.nodes.length; i++) {

          var checkExists: boolean = false;
          var currentSize: number = graph.nodes.length;
          for (var k = 0; k < currentSize; k++) {
            if (results.nodes[i].id === graph.nodes[k].id) {
              checkExists = true;
            }
          }
          if (checkExists != true) {
            graph.nodes.push({
              id: results.nodes[i].id,
              name: results.nodes[i].label,
              group: results.nodes[i].types[0], //todo: fix this and use more groups
              img: (results.nodes[i].depiction == null) ? null : results.nodes[i].depiction,
              description: (results.nodes[i].description == null) ? null : results.nodes[i].description,
              url: results.nodes[i].swapi_url
            });
          }
        }

       for (var i = 0; i < results.edges.length; i++) {

          var checkExists: boolean = false;
          var currentSize: number = graph.links.length;
          for (var k = 0; k < currentSize; k++) {
            if (results.edges[i].from === graph.links[k].source && results.edges[i].to === graph.links[k].target ) {
              checkExists = true;
              console.log("duplicate link! ");
            }
          }
           if (checkExists != true) {
          graph.links.push({
            source: results.edges[i].from,
            target: results.edges[i].to,
            strength: 1,
            arrows: results.edges[i].arrows[1],
            relationship: results.edges[i].label
          });
          }
        }
        return graph;
      })
      .catch ( (error:any) => Observable.throw (error.json() || 'Server error'));
  }

}
