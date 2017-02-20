import {Component, OnInit, OnChanges, ViewChild, ElementRef, Input, ViewEncapsulation} from '@angular/core';
import * as d3 from 'd3';
import {GraphService} from '../../services/graph/graph.service';

@Component ({
  selector: 'app-force',
  templateUrl: './force.component.html',
  styleUrls: [
    './force.component.css'
  ],
  encapsulation: ViewEncapsulation.None
})

export class ForceComponent implements OnInit, OnChanges {
  @ViewChild ('chart') private chartContainer: ElementRef;
  @Input() private data: {nodes: Array<any>, links: Array<any>};
  private margin: any = {top: 20, bottom: 20, left: 20, right: 20};
  private chart;
  private width: number = 0;
  private height: number = 0;
  private minZoom: number = 0.1;
  private maxZoom: number = 10;
  private nodeRadius: number = 25;

  private simulation;
  private container;
  private nodesGrp;
  private linksGrp;
  private linkSelector;
  private nodeSelector;
  private hiddenProperties = {
    description: true, img: true, x: true, y: true, vx: true, vy: true, index: true, id: true,
    name: true, group: true, fx: true, fy: true, moved: true, originalNode: true, url: true,
    depiction: true, label: true, types: true
  };


  constructor (private graph: GraphService) {
  }

  ngOnInit() {
    this.assembleChart();

    if (this.data) {
      this.restart();
    }
  }

  ngOnChanges() {
    if (this.data) {
      this.restart()
    }
  }


  assembleChart() {
    console.log ("assembling...");
    //define what element  is going to be used for a chart
    let element = this.chartContainer.nativeElement;
    this.width = element.offsetWidth - this.margin.left - this.margin.right;
    this.height = element.offsetHeight - this.margin.top - this.margin.bottom;
    let svg = d3.select (element).append ("svg")
        .attr ("id", "force")
        .attr ("width", element.offsetWidth)
        .attr ("height", element.offsetHeight)
      ;
    this.container = svg.append ("g")
      .attr ("id", "chart")
      .call (d3.drag()
        .on ("start", this.dragstarted)
        .on ("drag", this.dragged)
        .on ("end", this.dragended)
      );

    svg.call (
      d3.zoom().scaleExtent ([this.minZoom, this.maxZoom])
        .on ("zoom", () => {
          this.container.attr ("transform", d3.event.transform)
        })
    ).on ("dblclick.zoom", () => {
      null
    });
    console.log ("setting up defs");
    var defs = this.container.append ("defs");

    defs.selectAll ("marker").data (["end"])
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

    defs.append ("clipPath")
      .attr ("id", "circle-view")
      .append ("circle")
      .style ("fill", "#555")
      .style ("stroke-width", "4")
      .style ("stroke", "#455")
      .attr ("r", this.nodeRadius - 1);

    this.linksGrp = this.container.append ("g") .attr ("class", "links");
    this.linkSelector = this.linksGrp.selectAll (".relationship");

    this.nodesGrp = this.container.append ("g").attr ("class", "nodes");
    this.nodeSelector = this.nodesGrp.selectAll (".node");

    this.simulation = d3.forceSimulation (this.data.nodes)
      .force ("charge", d3.forceManyBody ().strength (-500))  // .distanceMax(400).distanceMin(1))
      .force ("center", d3.forceCenter (this.width / 2, this.height / 2))
      .force ("link", d3.forceLink (this.data.links).distance (180).strength (0.5).id ((d: any) => {
        return d.id;
      }))
      .force ("collide", d3.forceCollide ((d: any) => {
        return d.r
      }))
      .force ("x", d3.forceX())
      .force ("y", d3.forceY())
      .alphaTarget (1)
      // .velocityDecay (0.2)
      .on ("tick", () => {

        this.nodesGrp.selectAll (".nodeContainer")
          .attr ("transform", (d) => {
            return "translate(" + d.x + "," + d.y + ")";
          })
        ;

        this.linksGrp.selectAll (".link")
          .attr ("x1", (d) => {
            //console.log("link source x coordinate is: " + d.source.x + " name: " + d.name);
            return d.source.x;
          })
          .attr ("y1", (d) => {
            return d.source.y;
          })
          .attr ("x2", (d) => {
            return d.target.x;
          })
          .attr ("y2", (d) => {
            return d.target.y;
          })
        ;

        // FixMe: I've messed this up somehow, it's not selecting the text nodes properly
        this.linksGrp.selectAll (".linkLabelGrp")
          .attr ("transform", (d: any) => {
            var angle = Math.atan ((d.source.y - d.target.y) / (d.source.x - d.target.x)) * 180 / Math.PI;
            return 'translate(' + [((d.source.x + d.target.x) / 2 ), ((d.source.y + d.target.y) / 2 )] + ')rotate(' + angle + ')';
          });
      });

    // Define the div for the tooltip
    d3.select ("body")
      .append ("div")
      .attr ("class", "tooltip")
      .style ("opacity", 0);
  }

  showObjects() {
    console.log ("============= SHOW OBJECTS ==================")
    console.log ("container is:");
    console.log (this.container);
    console.log ("link selector is:");
    console.log (this.linkSelector);
    console.log ("nodes selector is:");
    console.log (this.nodeSelector);
    console.log ("node group is:");
    console.log (this.nodesGrp);
  }

  restart() {
    if (this.nodeSelector == null) return;    // Can happen on first paint,
    let color = d3.scaleOrdinal (d3.schemeCategory20);
    let tooltipContainer = d3.select (".tooltip")

    // Apply the general update pattern to the nodes.
    this.nodeSelector = this.nodesGrp.selectAll ('.node')
      .data (this.data.nodes, (d) => {
        return d.id
      });
    this.nodeSelector.exit ().remove ();
    var node = this.nodeSelector.enter ()
        .append ("g")
        .attr ("class", "node nodeContainer")
        .on ("click", (d) => {
          //todo remove selection later on
          //there is a probably better way to dd this but this.parentNode didn't work for me
          node.selectAll(".rm").remove()
          let parent = d3.select(node.nodes()[d.index]);

          parent.insert ("path", "circle")
            .attr ("d", "M0 0-70 70A99 99 0 0 1-70-70Z")
            .attr ("class", "rm radial-menu")
            .on("click", this.nodeDoubleClicked);
          parent.insert("text")
            .attr("class", "rm radial-menu radial-menu-text")
            .attr ("text-anchor", "middle")
            .attr("x", -60)
            .attr("y", 0)
            .text("Outbound")
            .on("click", this.nodeDoubleClicked);

          parent.insert ("path", "circle")
            .attr ("d", "M0 0-70-70A99 99 0 0 1 70-70Z")
            .attr ("class", "rm radial-menu")
            .on("click", this.InboundNodesClicked);
          parent.insert("text")
            .attr("class", "rm radial-menu radial-menu-text")
            .attr ("text-anchor", "middle")
            .attr("x", 0)
            .attr("y", -60)
            .text("Inbound")
            .on("click", this.InboundNodesClicked);

          parent.insert ("path", "circle")
            .attr ("d", "M0 0 70-70A99 99 0 0 1 70 70Z")
            .attr ("class", "rm radial-menu");


          parent.insert ("path", "circle")
            .attr ("d", "M0 0 70 70A99 99 0 0 1-70 70Z")
            .attr ("class", "rm radial-menu")
            .on("click", (d) => {
              node.selectAll(".rm").exit().remove()
            });
          parent.insert("text")
            .attr("class", "rm radial-menu radial-menu-text")
            .attr ("text-anchor", "middle")
            .attr("x", 0)
            .attr("y", 60)
            .text("Close");
        })
        .on ("dblclick", this.nodeDoubleClicked)
        // .on ("contextmenu", contextMenu)
        .call (d3.drag ()
          .on ("start", this.dragstarted)
          .on ("drag", this.dragged)
          .on ("end", this.dragended)
        )
        .merge (this.nodeSelector)
      ;


    // http://stackoverflow.com/questions/32750613/svg-draw-a-circle-with-4-sectors
    /* node.append("path")
     .attr("d", "M0 0-70 70A99 99 0 0 1-70-70Z");
     node.append("path")
     .attr("d", "M0 0-70-70A99 99 0 0 1 70-70Z");
     node.append("path")
     .attr("d", "M0 0 70-70A99 99 0 0 1 70 70Z");
     node.append("path")
     .attr("d", "M0 0 70 70A99 99 0 0 1-70 70Z");*/


    node.append ("circle")
      .attr ("class", "halo")
      .style ("stroke-width", "8px")
      .attr ("r", this.nodeRadius);

    //circle with a opaque fill so that lines in background are not visible
    //circle with a opaque fill so that lines in background are not visible
    node.append ("circle")
      .attr ("class", "node")
      .attr ("r", this.nodeRadius)
      .style ("fill", "#eee");

    //main node
    node.append ("circle")
      .attr ("class", "node")
      .attr ("r", this.nodeRadius)
      //change the outer layer of circle's colour
      .style ("stroke", (d: any, i: any) => {
        return color (d.group);
      })
      //.style("fill", "#eee")
      .style ("fill", (d: any, i: any) => {
        return color (d.group);
      })
      .style ("fill-opacity", 0.2);

    //node text
    node.append ("text")
      .attr ("class", "node node-text")
      .text ((d: any) => {
        return d.name;
      })
      .attr ("text-anchor", "middle")
      .attr ("dy", ".35em")
      .attr ("clip-path", "url(#circle-view)");

    //node image
    node.append ("image")
      .attr ("class", "node")
      // width height directly relates to inverse x/y here. divide by 2 here
      .attr ("x", (d) => {
        return -40;
      })
      .attr ("y", (d) => {
        return -40;
      })
      .attr ("height", 80)
      .attr ("width", 80)
      .attr ("xlink:href", (d: any) => {
        return d.img
      })
      .attr ("clip-path", "url(#circle-view)")
      .on ("mouseover", (d: any) => {
        tooltipContainer.transition()
          .delay (300)
          .duration (200)
          .style ("opacity", 1.0);
        tooltipContainer.html (this.getTooltipText (d))
          .style ("left", (d3.event.pageX) + "px")
          .style ("top", (d3.event.pageY - 28) + "px");
      })
      .on ("mouseout", (d: any) => {
        tooltipContainer.transition()
          .duration (500)
          .style ("opacity", 0);
      })
      .on ("mousedown", (d: any) => {
        tooltipContainer.transition()
          .duration (100)
          .style ("opacity", 0);
      })
    ;


    // Apply the general update pattern to the links.
    this.linkSelector = this.linksGrp.selectAll ('.relationship')
      .data (this.data.links, (d) => {
        return d.id
      });
    this.linkSelector.exit().remove();
    var link = this.linkSelector.enter()
      .append ("g")
      .attr ("class", "linkContainer relationship")
      .merge (this.linkSelector);

    /*
     link.insert ("line")
     .attr ("class", "relationship halo")
     .style("stroke-width", "10px");
     */

    //linkLine
    link.insert ("line", "rect")
      .attr ("class", "link relationship")
      .attr ("marker-end", "url(#end)");

    //linkLabel
    link.append ("text")
      .attr ("class", "linkLabelGrp relationship")
      .attr ("font-size", "10px")
      .attr ("x", -20)
      .attr ("dy", ".35em")
      // .attr("filter", "url(#solid)")
      .text ((d: any) => {
        return d.relationship;
      })
      .call (this.getTextBox);


    //linkBoundBox: https://bl.ocks.org/mbostock/1160929
    link.insert ("rect", "text")
      .attr ("class", "linkLabelGrp linkboundBox relationship")
      .attr ("x", (d: any) => {
        return -20
      })
      .attr ("y", (d: any) => {
        return -4
      })
      .attr ("width", (d: any) => {
        return d.bbox.width + 1
      })
      .attr ("height", (d: any) => {
        return d.bbox.height + 2
      });

    //this.showObjects ();

    // Update and restart the simulation.
    this.simulation.nodes (this.data.nodes);
    this.simulation.force ("link").links (this.data.links);
    this.simulation.alpha (1).restart();

  }


  addToGraph (newData) {
    this.mergeLists (this.data.links, newData.links);
    this.mergeLists (this.data.nodes, newData.nodes);
  }

  mergeLists (existing, added) {
    let list = [];

    for (let i = 0; i < added.length; i++) {
      if (!this.itemExistsInList (existing, added[i].id)) {
        existing.push (added [i])
      }
    }
  }

  // This is an inefficient O^N algorithm, there is probably a better JavaScript way to do this
  itemExistsInList (list, id) {
    for (let i = 0; i < list.length; i++) {
      if ((list [i].id == id)) {
        return true;
      }
    }

    return false
  }

  getTextBox (selection) {
    selection.each (function (d) {
      d.bbox = this.getBBox();
    })
  }

  private getTooltipText: any = (data) => {
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
    html += this.formatProperties (data);

    html += "</div>";

    return html
  }

  formatProperties (props) {
    let str = '';

    for (let key in props) {
      if (key == 'originalNode') {
        str += this.formatProperties (props [key])
      } else {

        if (this.hiddenProperties [key] == true) continue;

        if (props [key] != null) {
          str += '<p class="tooltip-prop"><span class="tooltip-prop-label">' + key + ':</span> <span class="tooltip-prop-value">' + props [key] + '</span></p>\n'
        }
      }
    }

    return str;
  }


  /* ============== Event Handlers =========================*/

  private nodeDoubleClicked: any = (d: any) => {
    this.graph.getOutboundNodes (d.id).subscribe (newData => {
      this.addToGraph (newData);
      this.restart ();
    });
  }

  /*private nodeSingleClicked: any = (d: any) => {
    let node = d3.select (this);
    console.log ("singleClick!");
    node.append ("path")
      .attr ("d", "M0 0-70 70A99 99 0 0 1-70-70Z");
    node.append ("path")
      .attr ("d", "M0 0-70-70A99 99 0 0 1 70-70Z");
    node.append ("path")
      .attr ("d", "M0 0 70-70A99 99 0 0 1 70 70Z");
    node.append ("path")
      .attr ("d", "M0 0 70 70A99 99 0 0 1-70 70Z");
  }*/

  private InboundNodesClicked: any = (d: any) => {
    this.graph.getInboundNodes (d.id).subscribe (newData => {
      this.addToGraph (newData);
      this.restart()
    });
  }

  private dragstarted: any = (d: any) => {
    if (!d3.event.active) this.simulation.alphaTarget (0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
    d.moved = false;
  }

  private dragged: any = (d: any) => {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
    d.moved = true;
  }

  private dragended: any = (d: any) => {
    if (d.moved == false) {
      d.fx = d.fy = null
    }

    // 'calm down' graph nodes after some time as we reach alpha = 0
    if (!d3.event.active) this.simulation.alphaTarget (0);
  }

}