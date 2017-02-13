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

  constructor (private graph: GraphService) { }

  ngOnInit() {

    this.createChart();

    if (this.data) {
      this.updateChart (this.data);
    }
  }

  ngOnChanges()
  {
    this.updateChart (this.data)
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

  updateChart (data)
  {
    let element = this.chartContainer.nativeElement;
    let width = element.offsetWidth - this.margin.left - this.margin.right;
    let height = element.offsetHeight - this.margin.top - this.margin.bottom;

    var margin: any = this.margin;
    var linkLabel: any;
    var linkboundBox: any;
    var linkLine: any;
    var simulation: any;
    var nodeSelection: any;
    var linkSelection: any;
    var defs: any;
    var container: any;
    var nodeRadius: number = 25;
    var graphF: any = this.graph;
    var nodeList: any = [];
    var linkList: any = [];
    var minZoom = 0.1;
    var maxZoom = 10;
    var zoom = d3.zoom().scaleExtent ([minZoom,maxZoom]);

    clear();
    build (data);

    function clear()
    {
        nodeList.length = 0;
        linkList.length = 0;

        // This should not be necessary, find out why the restart() doesn't remove nodes and links
        d3.select("#chart").remove();

        restart()
    }

    function addToGraph (data)
    {
        mergeLists (linkList, data.links);
        mergeLists (nodeList, data.nodes);
        restart()
    }

    function mergeLists (existing, added)
    {
        let list = [];

        for (let i = 0; i < added.length; i++) {
            if ( ! itemExistsInList (existing, added[i].id)) {
                existing.push (added [i])
            }
        }
    }

    // This is an inefficient O^N algorithm, there is probably a better JavaScript way to do this
    function itemExistsInList (list, id)
    {
        for (let i = 0; i < list.length; i++) {
            if ((list [i].id == id) ) {
                return true;
            }
        }

        return false
    }



    function build (data)
    {

      //chart plot
      let svg = d3.select("svg");

      container = svg.append("g")
          .attr("id", "chart")
          .call(d3.drag()
              .on("start", dragstarted)
              .on("drag", dragged)
              .on("end", dragended)
        )
      //.on("keypress", keypress)
      ;

      zoom.on ("zoom", function() {
          container.attr ("transform", d3.event.transform)
      });

      svg.call (zoom);

      /*
       Define <defs> part of svg. This is going to contain any reusable definitions of shapes
       */

      defs = container.append ("defs");

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

      // let color = d3.scaleOrdinal(d3.schemeCategory20);

      mergeLists (linkList, data.links);

        var linksGrp = container.append ("g") .attr ("class", "links");
        linkSelection = linksGrp.selectAll ("line").data ([], function(d) { return d.id; });

        // setLinks (linkList);
      // linkSelection = setLinks (linkList);

      mergeLists (nodeList, data.nodes);

        container.append("g").attr("class", "nodes");
        var nodesGrp = container.append("g").attr("class", "nodes");
        nodeSelection = nodesGrp.selectAll ("circle").data ([], function(d) { return d.id; });

        simulate()
        restart()
    }


    function simulate() {

      simulation = d3.forceSimulation (nodeList)
        .force ("charge", d3.forceManyBody().strength(-500))  // .distanceMax(400).distanceMin(1))
        .force ("center", d3.forceCenter (width / 2, height / 2))
        .force ("link", d3.forceLink (linkList).distance (180).strength (0.5).id (function (d: any) { return d.id; }))
        .force ("collide", d3.forceCollide (function (d:any) { return d.r }))
        .force ("x", d3.forceX())
        .force ("y", d3.forceY())
        .alphaTarget(1)
        // .velocityDecay (0.2)
        .on("tick", ticked)
      ;
    }

    function getTextBox (selection) {
      selection.each(function (d) {
        d.bbox = this.getBBox();
      })
    }

          let hiddenProperties = {
                  description: true, img: true, x: true, y: true, vx: true, vy: true, index: true, id: true,
                  name: true, group: true, fx: true, fy: true, moved: true, originalNode: true, url: true,
                  depiction: true, label: true, types: true
          };

          function getTooltipText(data) {
                  let html = '<h2 class="tooltip-name">' + data.group + ": " + data.name + '</h2>';

                  if ((data.description != null) || (data.img != null)) {
                          html += "<div class='tooltip-desc-row'>";

                          if (data.img != null) {
                                  html += '<img src="' + data.img + '" title="' + data.name + '" class="tooltip-image"/>';
                          }

                          if (data.description != null) {
                                  html += '<p class="tooltip-description">' + data.description + '</p>'
                          }

                          html += "</div>";
                  }

                  html += "<div class='tooltip-desc-row'>";
                  html += formatProperties (data);

                  html += "</div>";

                  return html
          }

          function formatProperties(props) {
                  let str = '';

                  for (let key in props) {
                          if (key == 'originalNode') {
                                  str += formatProperties(props [key])
                          } else {

                                  if (hiddenProperties [key] == true) continue;

                                  if (props [key] != null) {
                                          str += '<p class="tooltip-prop"><span class="tooltip-prop-label">' + key + ':</span> <span class="tooltip-prop-value">' + props [key] + '</span></p>\n'
                                  }
                          }
                  }

                  return str;
          }

    function ticked() {
      // TODO: may want to combine link label with white box underneath so less calculations are done. may have performance issues later on
     // linkLabel.attr("transform", function (d: any) {
     //    var angle = Math.atan((d.source.y - d.target.y) / (d.source.x - d.target.x)) * 180 / Math.PI;
     //    return 'translate(' + [((d.source.x + d.target.x) / 2 ), ((d.source.y + d.target.y) / 2 )] + ')rotate(' + angle + ')';
     //  });

      // linkboundBox.attr("transform", function (d: any) {
      //   var angle = Math.atan((d.source.y - d.target.y) / (d.source.x - d.target.x)) * 180 / Math.PI;
      //   return 'translate(' + [((d.source.x + d.target.x) / 2 ), ((d.source.y + d.target.y) / 2 )] + ')rotate(' + angle + ')';
      // });


        nodeSelection.attr ("cx", function(d) { return d.x; })
            .attr ("cy", function(d) { return d.y; })
            .attr ("transform", function (d: any) { return "translate(" + d.x + "," + d.y + ")"; })
        ;

      linkSelection.selectAll("line")
            .attr ("x1", function(d) { return d.source.x; })
            .attr ("y1", function(d) { return d.source.y; })
            .attr ("x2", function(d) { return d.target.x; })
            .attr ("y2", function(d) { return d.target.y; })
        ;

        // FixMe: I've messed this up somehow, it's not selecting the text nodes properly
        linkSelection.selectAll ("text")
            .attr("transform", function (d: any) {
                var angle = Math.atan((d.source.y - d.target.y) / (d.source.x - d.target.x)) * 180 / Math.PI;
                return 'translate(' + [((d.source.x + d.target.x) / 2 ), ((d.source.y + d.target.y) / 2 )] + ')rotate(' + angle + ')';
            });

        linkSelection.selectAll ("rect")
            .attr("transform", function (d: any) {
                var angle = Math.atan((d.source.y - d.target.y) / (d.source.x - d.target.x)) * 180 / Math.PI;
                return 'translate(' + [((d.source.x + d.target.x) / 2 ), ((d.source.y + d.target.y) / 2 )] + ')rotate(' + angle + ')';
            });
    }

      function restart()
      {
          if (nodeSelection == null) return;    // Can happen on first paint,

          // Apply the general update pattern to the nodes.
          nodeSelection = nodeSelection.data (nodeList, function(d) { return d.id;});
          nodeSelection.exit().remove();
          nodeSelection = nodeSelection.enter()
              .append("g").attr("class", "node")
              .on("dblclick", nodeDoubleClicked)
              // .on ("contextmenu", contextMenu)
              .call(d3.drag()
                  .on("start", dragstarted)
                  .on("drag", dragged)
                  .on("end", dragended)
              )
              .merge (nodeSelection)
          ;

          let color = d3.scaleOrdinal (d3.schemeCategory20);

          // Define the div for the tooltip
          var div = d3.select ("body")
              .append("div")
              .attr("class", "tooltip")
              .style("opacity", 0);

          //circle with a opaque fill so that lines in background are not visible
          var circle = nodeSelection.append("circle")
              .attr("r", nodeRadius)
              .style("fill", "#eee");

          var circle = nodeSelection.append("circle")
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

          var text = nodeSelection.append("text")
              .text(function (d: any) {
                  return d.name;
              })
              .attr("class", "node-text")
              .attr("text-anchor", "middle")
              .attr("dy", ".35em")
              .attr("clip-path", "url(#circle-view)");

          var image = nodeSelection.append("image")
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
                          .style("opacity", 1.0);
                      div.html (getTooltipText (d))
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


          // Apply the general update pattern to the links.
          linkSelection = linkSelection.data(linkList, function(d) { return d.id; });
          linkSelection.exit().remove();
          linkSelection = linkSelection.enter()
              .append("g")
              .attr("class","link relationship")
              .merge (linkSelection);

          linkLine = linkSelection
              .insert ("line", "rect")
              .attr("class", "relationship")
              .attr ("marker-end", "url(#end)");

          linkLabel = linkSelection.append ("text")
              .attr("class", "linkLabel relationship")
              .attr("font-size", "10px")
              .attr("x", -20)
              .attr("dy", ".35em")
              // .attr("filter", "url(#solid)")
              .text(function (d: any) {
                  return d.relationship;
              }).call (getTextBox);

          //https://bl.ocks.org/mbostock/1160929
          linkboundBox = linkSelection.insert ("rect", "text")
              .attr("class", "linkboundBox relationship")
              .attr("x", function (d: any) {
                  return -20
              })
              .attr("y", function (d: any) {
                  return -4
              })
              .attr("width", function (d: any) {
                  return d.bbox.width + 1
              })
              .attr("height", function (d: any) {
                  return d.bbox.height + 2
              });


          // Update and restart the simulation.
          simulation.nodes (nodeList);
          simulation.force ("link").links (linkList);
          simulation.alpha (1).restart();
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
        graphF.getOutboundNodes(d.id).subscribe (newData => {
          addToGraph (newData);
          restart()
        });
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
