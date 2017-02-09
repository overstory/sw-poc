import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { GraphService } from '../../services/graph/graph.service';

@Component({
  selector: 'app-two-parameter-selector',
  templateUrl: './two-parameter-selector.component.html',
  styleUrls: ['./two-parameter-selector.component.css']
})
export class TwoParameterSelectorComponent implements OnInit {
  labels: any = { labels: [] };
  character: any = {
    firstCharacter: null,
    secondCharacter: null
  };

  constructor(
    private graph: GraphService
  ) { }

  ngOnInit() {
    this.getCharacterList()
  }

  /* get character list to populate the dropdown list */
  getCharacterList() {
    this.graph.getLabelEntries ('Character').subscribe (data => this.labels = data);
  }

  getNearestPath() {
    let endPath = 'shortest-path-by-name/' + this.character.firstCharacter + '/' + this.character.secondCharacter;
    console.log (endPath);
    this.graph.getQueryResults (endPath).subscribe (data => {
      this.graph.announce (data)
    });
  }

}
