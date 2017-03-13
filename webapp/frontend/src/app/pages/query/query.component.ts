import { Component, OnInit } from '@angular/core';
import { GraphService } from "../../services/graph/graph.service";

@Component({
  selector: 'app-query',
  templateUrl: './query.component.html',
  styleUrls: ['./query.component.css'],
  providers: [ GraphService ]
})
export class QueryComponent implements OnInit {
  private chartData: Array<any>;

  constructor(
    private graph: GraphService
  ) {
    graph.dataSourced$.subscribe(data => {
      this.chartData = data;
    });
  }

  ngOnInit() {
    this.graph.getQueryResults("root").subscribe(data => this.chartData = data);
  }

}
