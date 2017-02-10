import {Component, OnInit, OnChanges, ViewChild, ElementRef, Input, ViewEncapsulation} from '@angular/core';
import * as d3 from 'd3';
import { GraphService } from '../../services/graph/graph.service';

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
  private margin: any = {top: 20, bottom: 20, left: 20, right: 20};
  private chart: any;
  private width: number;
  private height: number;
  private initialData: any;


  constructor(
    private graph: GraphService
  ) {
  }


  ngOnInit() {

    this.createChart();
    if (this.data) {
      this.updateChart(this.data);
    }
  }

  ngOnChanges() {
    this.updateChart(this.data)
  }

  createChart() {

    //define what element  is going to be used for a chart
    let element = this.chartContainer.nativeElement;
    let width = element.offsetWidth - this.margin.left - this.margin.right;
    let height = element.offsetHeight - this.margin.top - this.margin.bottom;
    let svg = d3.select(element).append("svg")
        .attr("id", "force")
        .attr("width", element.offsetWidth)
        .attr("height", element.offsetHeight)
      ;
  }

  updateChart(data) {
    let element = this.chartContainer.nativeElement;
    let width = element.offsetWidth - this.margin.left - this.margin.right;
    let height = element.offsetHeight - this.margin.top - this.margin.bottom;

    var margin: any = this.margin;
    var linkLabel: any;
    var linkboundBox: any;
    var links: any;
    var link: any;
    var simulation: any;
    var node: any;
    var defs: any;
    var container: any;
    var nodeRadius: number = 25;
    var graphF: any = this.graph;

    clear();
    build(data);


    function clear() {
      return d3.select("#chart").remove()
    }

    function build(data) {
      //chart plot
      let svg = d3.select("svg")
      container = svg.append("g")
        .attr("id", "chart")
        .attr("transform", `translate(${margin.left}, ${margin.top})`)
        .call(d3.drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended)
        )

// .on("keypress", keypress)
      ;

      /*
       Define <defs> part of svg. This is going to contain any reusable definitions of shapes
       */

      defs = container.append("defs")



      defs.selectAll("marker").data(["end"])
        .enter().append("svg:marker")
        .attr("id", String)
        .attr("viewBox", "0 -5 10 10")
        //refX value must be the same as radius of an outer circle - this way it will be pointing correctly
        .attr("refX", 37)
        .attr("refY", 0)
        .attr("markerWidth", 9)
        .attr("markerHeight", 9)
        .attr("orient", "auto")
        .style('fill', "#aaa")
        .append("svg:path")
        .attr("d", "M0,-5L10,0L0,5");

      defs.append("clipPath")
        .attr("id", "circle-view")
        .append("circle")
        .style("fill", "#555")
        .style("stroke-width", "4")
        .style("stroke", "#455")
        .attr("r", nodeRadius - 1);

      var color = d3.scaleOrdinal(d3.schemeCategory20);

      //group all links under one <g class="links">
      var linksGrp = container
          .append("g")
          .attr("class", "links")
        ;
      var linkGrp = linksGrp
          .selectAll("line")
          .data(data.links)
        ;
      link = linkGrp
        .enter()
        .append("g")
      ;


      linkGrp.selectAll("line").exit().remove();


      links = link
        .append("line")
        .attr("marker-end", "url(#end)")
      ;


      linkLabel = link.append("text")
        .attr("class", "linkLabel")
        .attr("font-size", "8px")
        .attr("x", -20)
        .attr("dy", ".35em")
        // .attr("filter", "url(#solid)")
        .text(function (d: any) {
          return d.relationship;
        }).call(getTextBox);

      //https://bl.ocks.org/mbostock/1160929
      linkboundBox = link.insert("rect", "text")
        .attr("x", function (d: any) {
          return -20
        })
        .attr("y", function (d: any) {
          return -2
        })
        .attr("width", function (d: any) {
          return d.bbox.width + 1
        })
        .attr("height", function (d: any) {
          return d.bbox.height + 3
        })
        .style("fill", "#fff");

      //group all nodes under one <g class="nodes"
      var nodesGrp = container.append("g")
        .attr("class", "nodes");
      var nodeGroup = nodesGrp.selectAll("circle").data(data.nodes);

      node = nodeGroup
        .enter().append("g")
        .attr("class", "node")
        .on("dblclick", nodeDoubleClicked)
        // .on ("contextmenu", contextMenu)
        .call(d3.drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended)
        )
      ;

      nodeGroup.selectAll("circle").exit().remove();




      // Define the div for the tooltip
      var div = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);


      //circle with a opaque fill so that lines in background are not visible
      var circle = node.append("circle")
        .attr("r", nodeRadius)
        .style("fill", "#eee");

      var circle = node.append("circle")
        .attr("r", nodeRadius)
        //change the outer layer of circle's colour
        .style("stroke", function (d: any, i: any) {
          return color(d.group);
        })
        //.style("fill", "#eee")
        .style("fill", function (d: any, i: any) {
          return color(d.group);
        })
        .style("fill-opacity", 0.2);

      var text = node.append("text")
        .text(function (d: any) {
          return d.name;
        })
        .attr("class", "node-text")
        .attr("text-anchor", "middle")
        .attr("dy", ".35em")
        .attr("clip-path", "url(#circle-view)");

      var image = node.append("image")
        // width height directly relates to inverse x/y here. divide by 2 here
          .attr("x", function (d) {
            return -40;
          })
          .attr("y", function (d) {
            return -40;
          })
          .attr("height", 80)
          .attr("width", 80)
          .attr("xlink:href", function (d: any) {
            return d.img
          })
          .attr("clip-path", "url(#circle-view)")
          .on("mouseover", function (d: any) {
            div.transition()
              .delay(300)
              .duration(200)
              .style("opacity", .9);
            div.html(getTooltipText(d))
              .style("left", (d3.event.pageX) + "px")
              .style("top", (d3.event.pageY - 28) + "px");
          })
          .on("mouseout", function (d: any) {
            div.transition()
              .duration(500)
              .style("opacity", 0);
          })
          .on("mousedown", function (d: any) {
            div.transition()
              .duration(100)
              .style("opacity", 0);
          })
        ;
      simulate()
    }

    function simulate() {

      simulation = d3.forceSimulation()
        .velocityDecay(0.2)
        .force("charge", d3.forceManyBody().strength(-1000).distanceMax(400).distanceMin(1))
        .force("center", d3.forceCenter(width / 2, height / 2));

      simulation
        .nodes(data.nodes)
        .on("tick", ticked);

      simulation.force("link", d3.forceLink().distance(50).strength(0.8).id(function (d: any) {
        return d.id;
      }).links(data.links))

    }

    function getTextBox(selection) {
      selection.each(function (d) {
        d.bbox = this.getBBox();
      })
    }

    function getTooltipText(data) {
      let description = '<h2 class="tooltip-name">' + data.group + ": " + data.name + '</h2>';

      if (data.img != null) {
        description += '<img src="' + data.img + '" title="' + data.name + '" class="tooltip-image"/>';
      }

      if (data.description != null) {
        description += '<p class="tooltip-description">' + data.description + '</p>'
      }

      return description
    }

    function ticked() {
      // TODO: may want to combine link label with white box underneath so less calculations are done. may have performance issues later on
     linkLabel.attr("transform", function (d: any) {
        var angle = Math.atan((d.source.y - d.target.y) / (d.source.x - d.target.x)) * 180 / Math.PI;
        return 'translate(' + [((d.source.x + d.target.x) / 2 ), ((d.source.y + d.target.y) / 2 )] + ')rotate(' + angle + ')';
      });

      linkboundBox.attr("transform", function (d: any) {
        var angle = Math.atan((d.source.y - d.target.y) / (d.source.x - d.target.x)) * 180 / Math.PI;
        return 'translate(' + [((d.source.x + d.target.x) / 2 ), ((d.source.y + d.target.y) / 2 )] + ')rotate(' + angle + ')';
      });


      links
        .attr("x1", function (d: any) {
          return d.source.x;
        })
        .attr("y1", function (d: any) {
          return d.source.y;
        })
        .attr("x2", function (d: any) {
          return d.target.x;
        })
        .attr("y2", function (d: any) {
          return d.target.y;
        });

      node.attr("transform", function (d: any) {
        return "translate(" + d.x + "," + d.y + ")";
      })
    }

    function dragstarted(d: any) {
      if (!d3.event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
      d.moved = false;
    }

    function dragged(d: any) {
      d.fx = d3.event.x;
      d.fy = d3.event.y;
      d.moved = true;
    }

    function dragended(d: any) {
      if (d.moved == false) {
        d.fx = d.fy = null
      }

      // 'calm down' graph nodes after some time as we reach alpha = 0
      if (!d3.event.active) simulation.alphaTarget(0);
    }

    function nodeDoubleClicked(d: any) {
      let network: any = data;
      setTimeout(() => {
        graphF.getOutboundNodes(d.id, network).subscribe(data => {
          clear();
          build(data);
        });
      }, 4000);


    }

    function contextMenu(d) {
    }

    // function keypress (d)
    // {
    //   var key = d3.event.key;
    //
    //   if ((key != "-") && (key != "+") && (key != "=") && (key != "1")) return;
    //
    //   if (key == "1") {
    //     scale = 1.0;
    //   } else if (key == "-") {
    //     scale = scale * 0.8;
    //   } else {
    //     scale = scale * 1.2;
    //   }
    //
    //   if (scale < 0.1) scale = 0.1;
    //
    //   d3.select ("#diagramSvg").attr ("transform", function(d){ return "scale(" + scale + ")"; });
    //
    //   force.size ([width / scale, height / scale]);
    //
    //   force.start();
    // }


  }


}