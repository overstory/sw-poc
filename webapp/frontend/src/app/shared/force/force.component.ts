import {Component, OnInit, OnChanges, ViewChild, ElementRef, Input, ViewEncapsulation} from '@angular/core';
import * as d3 from 'd3';

@Component({
  selector: 'app-force',
  templateUrl: './force.component.html',
  styleUrls: [
    './force.component.css'
  ],
  encapsulation: ViewEncapsulation.None
})
export class ForceComponent implements OnInit {
  @ViewChild('chart') private chartContainer: ElementRef;
  @Input() private data: Array<any>;
  private margin: any = { top: 20, bottom: 20, left: 20, right: 20 };
  private chart: any;
  private width: number;
  private height: number;
  private nodeRadius: number = 25;
  @Input() private dataTest : any = {
    "nodes": [
      {
        "id": "Yoda",
        "group": "Actor",
        "img": "http://image.tmdb.org/t/p/w185/azFYGqcDS1Oo8skhbHzGPZSICTU.jpg",
        "biography": "Old guy. Very old."
      },
      {
        "id": "Han Solo",
        "group": "Actor",
        "img": "http://image.tmdb.org/t/p/w185/i8LGOkTaR5g6vh81dic7nfM975t.jpg",
        "biography": "His best friend is the hairy one"
      },
      {
        "id": "Leia Organa",
        "group": "Actor",
        "img": "http://image.tmdb.org/t/p/w185/pbleNurCYdrLFQMEnlQB2nkOR1O.jpg",
        "biography": "She is just a princess from Alderaan."
      },
      {
        "id": "Jar Jar",
        "group": "Voice",
        "img": "http://image.tmdb.org/t/p/w185/kBblb0GZjqN3W1VcJ2J5IkC7Qg3.jpg",
        "biography": "crazy long eared beast"
      },
      {"id": "Boba Fett", "group": "Film", "biography": "The villain"}
    ],
    "links": [
      {"source": "Yoda", "target": "Han Solo", "strength": 1, "relationship": ":FRIEND_OF"},
      {"source": "Yoda", "target": "Leia Organa", "strength": 4, "relationship": ":KNOWS"},
      {"source": "Leia Organa", "target": "Han Solo", "strength": 1, "relationship": ":IN_RELATIONSHIP"},
      {"source": "Han Solo", "target": "Jar Jar", "strength": 1, "relationship": ":IS_AFFILIATED_WITH"}
    ]
  };



  constructor() {
  }


  ngOnInit() {

    this.createChart (this.data);
    if (this.data) {
      this.updateChart (this.data);
    }
  }

  ngOnChanges() {
    if (this.chart) {
      this.updateChart (this.dataTest);
    }
  }

  createChart(data) {

    //define what element  is going to be used for a chart
    let element = this.chartContainer.nativeElement;
    let width = element.offsetWidth - this.margin.left - this.margin.right;
    let height = element.offsetHeight - this.margin.top - this.margin.bottom;

    let svg = d3.select (element).append ("svg")
      .attr ("width", element.offsetWidth)
      .attr("height", element.offsetHeight);

    //chart plot
    this.chart = svg.append ("g")
      .attr ("class", "bars")
      .attr ("transform", `translate(${this.margin.left}, ${this.margin.top})`);

    /*
     Define <defs> part of svg. This is going to contain any reusable definitions of shapes
     */

    var defs = this.chart.append ("defs")

    var clipart = defs.append ("clipPath")
      .attr ("id", "circle-view")
      .append ("circle")
      .style ("fill", "#555")
      .style ("stroke-width", "4")
      .style ("stroke", "#455")
      .attr ("r", this.nodeRadius - 1);


    var arrowheads = defs.selectAll ("marker").data (["end"])
      .enter().append ("svg:marker")
      .attr ("id", String)
      .attr ("viewBox", "0 -5 10 10")
      //refX value must be the same as radius of an outer circle - this way it will be pointing correctly
      .attr ("refX", 37)
      .attr ("refY", 0)
      .attr ("markerWidth", 9)
      .attr ("markerHeight", 9)
      .attr ("orient", "auto")
      .style ('fill', "#aaa")
      .append ("svg:path")
      .attr ("d", "M0,-5L10,0L0,5");


    var color = d3.scaleOrdinal(d3.schemeCategory20);

    var simulation = d3.forceSimulation()
      .force ("charge", d3.forceManyBody().strength(-2000).distanceMax(500).distanceMin(10))
      .force ("center", d3.forceCenter(width / 2, height / 2))


    //group all links under one <g class="links">
    var link = this.chart.append ("g")
      .attr ("class", "links")
      .selectAll ("line")
      .data (data.links)
      .enter().append ("g")


    //group all nodes under one <g class="nodes"
    var node = this.chart.append ("g")
      .attr ("class", "nodes")
      .selectAll ("circle")
      .data (data.nodes)
      .enter().append ("g")
      .attr ("class", "node")
      .call (d3.drag()
        .on ("start", dragstarted)
        .on ("drag", dragged)
        .on ("end", dragended));



    var links = link.append ("line")
      .attr ("marker-end", "url(#end)");


    var linkLabel = link.append ("text")
      .attr ("class", "linkLabel")
      .attr ("font-size", "8px")
      .attr ("x", -20)
      .attr ("dy", ".35em")
      // .attr("filter", "url(#solid)")
      .text (function (d: any) {
        return d.relationship;
      }).call (getTextBox);

    //https://bl.ocks.org/mbostock/1160929
    var linkboundBox = link.insert ("rect", "text")
      .attr ("x", function (d: any) {
        return -20
      })
      .attr ("y", function (d: any) {
        return -2
      })
      .attr ("width", function (d: any) {
        return d.bbox.width + 1
      })
      .attr ("height", function (d: any) {
        return d.bbox.height + 3
      })
      .style ("fill", "#fff");


    function getTextBox (selection) {
      selection.each (function (d) {
        d.bbox = this.getBBox();
      })
    }


    // Define the div for the tooltip
    var div = d3.select ("body")
      .append ("div")
      .attr ("class", "tooltip")
      .style ("opacity", 0);


    /*
    The node logic is here. Create a circle
     */
    var circle = node.append ("circle")
      .attr ("r", this.nodeRadius)
      //change the outer layer of circle's colour
      .style ("stroke", function (d: any, i: any) {
        return color (d.group);
      })
      .style("fill", "#eee");

    var image = node.append ("image")
    // width height directly relates to inverse x/y here. divide by 2 here
      .attr ("x", function (d) {
        return -40;
      })
      .attr ("y", function (d) {
        return -40;
      })
      .attr ("height", 80)
      .attr ("width", 80)
      .attr ("xlink:href", function (d: any) {
        return d.img
      })
      .attr ("clip-path", "url(#circle-view)")
      .on ("mouseover", function (d: any) {
        div.transition()
          .delay (300)
          .duration (200)
          .style ("opacity", .9);
        div.html ('<div class="name">' + d.group + ": " + d.name + '</div><p class="biography">' + d.biography + '</p>')
          .style ("left", (d3.event.pageX) + "px")
          .style ("top", (d3.event.pageY - 28) + "px");
      })
      .on ("mouseout", function (d: any) {
        div.transition()
          .duration (500)
          .style ("opacity", 0);
      });

    /* uncomment this if tooltip does not look good
     node.append("title")
     .text(function(d: any) { return d.id; });
     */


    simulation
      .nodes (data.nodes)
      .on ("tick", ticked);

	simulation.force("link", d3.forceLink().id (function (d: any) {
	  return d.id;
	}).links (data.links))


    function ticked() {
      // TODO: may want to combine link label with white box underneath so less calculations are done. may have performance issues later on
      linkLabel.attr ("transform", function (d: any) {
        var angle = Math.atan ((d.source.y - d.target.y) / (d.source.x - d.target.x)) * 180 / Math.PI;
        return 'translate(' + [((d.source.x + d.target.x) / 2 ), ((d.source.y + d.target.y) / 2 )] + ')rotate(' + angle + ')';
      });

      linkboundBox.attr ("transform", function (d: any) {
        var angle = Math.atan ((d.source.y - d.target.y) / (d.source.x - d.target.x)) * 180 / Math.PI;
        return 'translate(' + [((d.source.x + d.target.x) / 2 ), ((d.source.y + d.target.y) / 2 )] + ')rotate(' + angle + ')';
      });


      links
        .attr ("x1", function (d: any) {
          return d.source.x;
        })
        .attr ("y1", function (d: any) {
          return d.source.y;
        })
        .attr ("x2", function (d: any) {
          return d.target.x;
        })
        .attr ("y2", function (d: any) {
          return d.target.y;
        });

      node.attr ("transform", function (d: any) {
        return "translate(" + d.x + "," + d.y + ")";
      })
    }

    function dragstarted (d: any) {
      if (!d3.event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged (d: any) {
      d.fx = d3.event.x;
      d.fy = d3.event.y;
    }

    function dragended (d: any) {
      if (!d3.event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
  }


  // TODO: Work in progress
  updateChart (data) {

    let updateLinks = this.chart.selectAll ("line")
      .data (data.links);

    // remove  links
    updateLinks.exit().remove();

    // update existing circles
    let updateNodes = this.chart.selectAll ("circle")
      .data (this.dataTest.nodes);

    // add new nodes
    updateNodes
      .enter ().append ("g")
      .attr ("class", "node");
  }


}