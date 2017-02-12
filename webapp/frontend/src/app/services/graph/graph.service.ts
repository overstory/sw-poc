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
	private REFERENCED_NODES: string = "referenced-nodes/";

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

	getLabelEntries(label: string) {
		return this.http.get(this.settings.endpoint + 'nodes-by-label/' + label)
			.map(res => {
				let results = res.json().network;
				let output: any = {labels: []};
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
	getOutboundNodes(id: number): Observable<any> {
		return this.http.get(this.settings.endpoint + this.REFERENCED_NODES + id)
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
