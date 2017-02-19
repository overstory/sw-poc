import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { GraphService } from '../../services/graph/graph.service';

@Component({
  selector: 'app-by-label',
  templateUrl: './by-label.component.html',
  styleUrls: ['./by-label.component.css']
})
export class ByLabelComponent implements OnInit {
  labels: any = { labels: [] };
  label: any = null;
  relations: any = { relations: [] };
  relation: any = null;

  constructor(
    private graph: GraphService
  ) { }

  ngOnInit() {
    this.getLabelList();
    this.getRelationList();
  }

  /* get character list to populate the dropdown list */
  getLabelList() {
    this.graph.getLabelNames().subscribe (data => this.labels = data);
  }

  getRelationList() {
    this.graph.getRelationNames().subscribe (data => this.relations = data);
  }

  allLabels() {
    let endPath = 'nodes-by-label/' + this.label;
    console.log (endPath);
    this.graph.getQueryResults (endPath).subscribe (data => {
      this.graph.announce (data)
    });
  }

  allRelations() {
    let endPath = 'nodes-by-relation/' + this.relation;
    console.log (endPath);
    this.graph.getQueryResults (endPath).subscribe (data => {
      this.graph.announce (data)
    });
  }

}
