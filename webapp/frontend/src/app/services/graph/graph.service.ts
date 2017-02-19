import {Injectable} from '@angular/core';
import {Http, Headers, RequestOptions} from '@angular/http';
import {Observable, Subject} from "rxjs";

@Injectable()
export class GraphService {
	private defaultOptions: RequestOptions;
	private settings = {
		endpoint: 'http://localhost:5050/graph/query/id/'
	};
	private dataSource = new Subject<any>();
	private REFERENCED_NODES: string = "referenced-nodes";
	private REFERENCING_NODES: string = "referencing-nodes";
	private DIRECTED_BY: string = "directed-by";
	private PRODUCED_BY: string = "produced-by";
	private NODE_BY_ID: string = "node-by-id";
	private NODES_BY_LABEL: string = "";

	// Observable string streams
	dataSourced$ = this.dataSource.asObservable();

	constructor(private http: Http) {
	}

	announce(data: any) {
		this.dataSource.next(data);
	}

	getQueryResults(query: string): Observable<any> {
		let url = this.settings.endpoint + query;

		return this.http.get(url)
			.map(res => {
				return GraphService.reformatNodes (res.json().network);
			})
			.catch ((error: any) => Observable.throw(error.json() || 'Server error'));
	}

	getLabelNames() {
		return this.http.get(this.settings.endpoint + 'node-labels')
			.map(res => {
				let strings = res.json().strings;
				let stringsTmp: any = [];
				for (var i = 0; i < strings.length; i++) {
					stringsTmp.push ({
						name: strings [i],
						id: strings [i]
					})
				}
				return { labels: stringsTmp.sort ((n1, n2) => { return (n1.name > n2.name) ? 1 : (n1.name < n2.name) ? -1 : 0 }) }
			})
	}

	getLabelEntries(label: string) {
		return this.http.get(this.settings.endpoint + 'nodes-by-label/' + label)
			.map(res => {
				let results = res.json().network;
				let labelsTmp: any = [];
				for (var i = 0; i < results.nodes.length; i++) {
					labelsTmp.push({
						name: results.nodes[i].label,
						id: results.nodes[i].id
					})
				}
				return { labels: labelsTmp.sort ((n1, n2) => { return (n1.name > n2.name) ? 1 : (n1.name < n2.name) ? -1 : 0 }) }
			})
	}

	//localhost:5050/graph/query/id/referenced-nodes/9112
	getOutboundNodes(id: number): Observable<any> {
		return this.http.get(this.settings.endpoint + this.REFERENCED_NODES + '/' + id)
      .map(res => {
				return GraphService.reformatNodes (res.json().network);
			})
      .catch((error: any) => Observable.throw(error.json() || 'Server error'));
	}

	getInboundNodes(id: number): Observable<any> {
		return this.http.get(this.settings.endpoint + this.REFERENCING_NODES + '/' + id)
      .map(res => {
				return GraphService.reformatNodes (res.json().network);
			})
      .catch((error: any) => Observable.throw(error.json() || 'Server error'));
	}

	static reformatNodes (results) {
		let output = {nodes: [], links: []};

		for (var i = 0; i < results.nodes.length; i++) {
			let node = results.nodes[i];
			var checkExists: boolean = false;
			var currentSize: number = output.nodes.length;
			for (var k = 0; k < currentSize; k++) {
				if (node.id === output.nodes[k].id) {
					checkExists = true;
				}
			}
			if (checkExists != true) {
				output.nodes.push({
					id: node.id,
					name: ((node.label == null) || (typeof node.label === "undefined")) ? node['type'] : node.label,
					group: node.types[0], //todo: fix this and use more groups
					groups: node.types,
					img: node.depiction,
					description: node.description,
					url: node.swapi_url,
					originalNode: node
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
				id: results.edges[i].id,
				source: results.edges[i].from,
				target: results.edges[i].to,
				strength: 1,
				arrows: results.edges[i].arrows[1],
				relationship: results.edges[i].label
			});
			//}
		}
		return output;
	}

}
