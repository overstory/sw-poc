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
  private origWheelHandler: any = null;
  private tooltipFocus: boolean = false;
  private nodeFocus: boolean = false;

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

  private radialMenuToggle = null;


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
    //define what element is going to be used for a chart
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
      .force ("charge", d3.forceManyBody ().strength (-1250))  // .distanceMax(400).distanceMin(1))
      //.force ("center", d3.forceCenter (this.width / 2, this.height / 2))
      .force ("link", d3.forceLink (this.data.links).distance (2*this.nodeRadius+120).strength(1.4).id ((d: any) => { return d.id; }))
      .force ("collide", d3.forceCollide ((d: any) => { return this.nodeRadius + 2 }))
      .force ("x", d3.forceX(this.width / 2).strength(0.15))
      .force ("y", d3.forceY(this.height / 2).strength(0.15))
      .alphaTarget (0.9)
      // .velocityDecay (0.2)
      .on ("tick", () => {

        this.nodesGrp.selectAll (".nodeContainer")
          .attr ("transform", (d) => {
            return "translate(" + d.x + "," + d.y + ")";
          })
        ;

        this.linksGrp.selectAll (".link")
          .attr("d", (d) => {
     /*     var dx = d.target.x - d.source.x,
            dy = d.target.y - d.source.y,
            dr = Math.sqrt(dx * dx + dy * dy);
          let dAttribute;
          if (this.countLinks(d) > 1) {
            dAttribute = "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + d.target.x + "," + d.target.y;
          }
          else {
            dAttribute = "M" + d.source.x + "," + d.source.y + "L" + d.target.x + "," + d.target.y;
          }
          return dAttribute*/
            return this.countLinks(d)
        });

        /*
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
        ;*/

        // FixMe: I've messed this up somehow, it's not selecting the text nodes properly
    /*    this.linksGrp.selectAll (".linkLabelGrp")
          .attr ("transform", (d: any) => {
            var angle = Math.atan ((d.source.y - d.target.y) / (d.source.x - d.target.x)) * 180 / Math.PI;
            return 'translate(' + [((d.source.x + d.target.x) / 2 ), ((d.source.y + d.target.y) / 2 )] + ')rotate(' + angle + ')';
          });
        */
      });

    // Define the div for the tooltip
    d3.select ("body")
      .on ("keydown", keyDown)
      .on ("keyup", keyUp)
      .on ("mouseenter", bodyMouseEnter)
      .append ("div")
      .attr ("class", "tooltip")
      .style ("opacity", 0);

    svg.call (
      d3.zoom().scaleExtent ([0.1, 10]).on ("zoom", () => {
        d3.select ("#chart").attr ("transform", d3.event.transform)
      })
    ).on ("click", (d) => {
      this.removeRadialMenu();
    });

    function keyDown () {
      if (d3.event.keyCode == 16) {
        if (this.origWheelHandler != null) {
          svg.on ("wheel.zoom", this.origWheelHandler);
        }
      }
    }

    function keyUp () {
      if (d3.event.keyCode == 16) {
        if (this.origWheelHandler == null) {
          this.origWheelHandler = svg.on ("wheel.zoom");
        }
        svg.on ("wheel.zoom", null);
      }
    }

    // This is only here to catch a startup event so as to save off the wheel.zoom handler after it's been setup
    function bodyMouseEnter()
    {
      if (this.origWheelHandler == null) {
        this.origWheelHandler = svg.on ("wheel.zoom");
        svg.on ("wheel.zoom", null);
        svg.on ("dblclick.zoom", null);
      }
    }
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
    //let radialMenuToggle = null;

    // Apply the general update pattern to the nodes.
    this.nodeSelector = this.nodesGrp.selectAll ('.node')
      .data (this.data.nodes, (d) => {
        return d.id
      });
    this.nodeSelector.exit ().remove();

    var node = this.nodeSelector.enter()
        .append ("g")
        .attr ("class", "node nodeContainer")
        .on ("dblclick", this.outboundNodesClicked)
        // .on ("contextmenu", contextMenu)
        .call (d3.drag ()
          .on ("start", this.dragstarted)
          .on ("drag", this.dragged)
          .on ("end", this.dragended)
        )
        .merge (this.nodeSelector)
        // make sure that current node is on top of others. this is mainly for radial menu
        .on('mouseover', function() {
          this.parentNode.appendChild(this);
        })
      ;

    node.append ("circle")
      .attr ("class", "halo")
      .style ("stroke-width", "12px")
      .attr ("r", this.nodeRadius);

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
        this.nodeFocus = true;
        this.showTooltip (d, ".tooltip", 2000);
      })
      .on ("mouseout", (d: any) => {
        this.nodeFocus = false;
        this.hideTooltip (".tooltip")
      })
      .on ("mousedown", (d: any) => {
        this.hideTooltip (".tooltip");
      })
      .on ("click", (d) => {
        if (this.radialMenuToggle != d.id) {
          //there is a probably better way to dd this but this.parentNode didn't work for me
          this.removeRadialMenu();
          d3.event.stopPropagation();
          this.fixNode (d);
          let parent = d3.select (node.nodes ()[d.index]);

          let northwest =  parent.insert ("g", "circle")
            .attr ("class", "rm radialMenuContainer");
          northwest.insert ("path", "circle")
            .attr ("d", "M -9.184850993605149e-15 -50 A 50 50 0 0 0 -47.27592877996584 -16.27840772285784")
            .attr("stroke-width", "20")
            .attr ("class", "rm radial-menu")
            .on ("click", (d) => {
              this.outboundNodesClicked(d);
              this.fixNode (d);
              this.removeRadialMenu();
            });
          northwest.append ("text")
            .attr ("class", "rm radial-menu-text")
            .attr ("text-anchor", "middle")
            .attr ("x", -30)
            .attr ("y", -30)
            .text ("⬅")
            .on ("click", (d) => {
              this.outboundNodesClicked(d);
              this.fixNode (d);
              this.removeRadialMenu();
            });

          let northeast = parent.append ("g")
            .attr ("class", "rm radialMenuContainer");
          northeast.append ("path")
            .attr("d", "M 47.81523779815177 -14.618585236136838 A 50 50 0 0 0 0.8726203218641688 -49.992384757819565")
            .attr ("class", "rm radial-menu")
            .on ("click", (d) => {
              this.InboundNodesClicked(d);
              this.fixNode (d);
              this.removeRadialMenu();
            });
          northeast.append ("text")
            .attr ("class", "rm radial-menu-text")
            .attr ("text-anchor", "middle")
            .attr ("x", 30)
            .attr ("y", -30)
            .text("⬇")
            .on ("click", (d) => {
              this.InboundNodesClicked(d);
              this.fixNode (d);
              this.removeRadialMenu();
            });

          let southeast = parent.append ("g")
            .attr ("class", "rm radialMenuContainer");
          southeast.append ("path")
            .attr ("d", "M 29.389262614623657 40.45084971874737 A 50 50 0 0 0 47.81523779815177 -14.618585236136838")
            .attr ("class", "rm radial-menu")
            .on("click", (d) => {
              this.showTooltip(d, ".tooltip", 0);
              this.fixNode (d);
              this.removeRadialMenu();
            });
          southeast.append ("text")
            .attr ("class", "rm radial-menu-text")
            .attr ("text-anchor", "middle")
            .attr('font-family', 'FontAwesome')
            .attr ("x", 45)
            .attr ("y", 20)
            .text ( (d) => { return "\uf129" })
            .on("click", (d) => {
              this.showTooltip(d, ".tooltip", 0);
              this.fixNode (d);
              this.removeRadialMenu();
            });


          let southwest = parent.append ("g")
            .attr ("class", "rm radialMenuContainer");
          southwest.append ("path")
            .attr ("d", "M -29.38926261462365 40.45084971874737 A 50 50 0 0 0 28.678821817552304 40.95760221444959")
            .attr ("class", "rm radial-menu")
            .on ("click", (d) => {
              this.removeNodesClicked(d);
              this.fixNode (d);
              this.removeRadialMenu();
            });
          southwest.append ("text")
            .attr ("class", "rm radial-menu-text")
            .attr ("text-anchor", "middle")
            .attr ("x", 0)
            .attr ("y", 60)
            .text ("✘")
            .on("click", (d) => {
              this.removeNodesClicked(d);
              this.fixNode (d);
              this.removeRadialMenu();
            });


          let west = parent.append ("g")
            .attr ("class", "rm radialMenuContainer");
          west.append ("path")
            .attr ("d", "M -47.552825814757675 -15.450849718747387 A 50 50 0 0 0 -30.09075115760242 39.93177550236464")
            .attr ("class", "rm radial-menu")
            .on ("click", (d) => {
              this.unfixNode (d);
            });
          west.append ("text")
            .attr ("class", "rm radial-menu-text")
            .attr ("text-anchor", "middle")
            .attr('font-family', 'FontAwesome')
            .attr ("x", -45)
            .attr ("y", 20)
            .text ( (d) => { return '\uf0b2' })
            .on("click", (d) => {
              this.unfixNode (d);
            });

          this.radialMenuToggle = d.id;
        } else {
          //toggle id and id clicked next is exactly the same,
          // hence the same node was clicked again
          this.removeRadialMenu();
          this.fixNode (d);
          this.radialMenuToggle = null;
        }
    })
    ;

    node.append("title")
      .text( (d: any) => {
        return d.name
      });


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


     link.append ("path")
       .attr ("class", "link relationship halo")
       .style ("stroke-width", "20");


    //linkLine
    link.insert ("path", "rect")
      .attr ("class", "linkLine link relationship")
      .attr("id", (d) => {
        return "link-" + d.id
      })
      .attr ("marker-end", "url(#end)");

    //linkBoundBox hack
  /*  link.append ("text")
      .attr ("class", "relationship linkboundBox")
      .attr ("font-size", "12px")
      .attr ("stroke-width", 6)
      .attr ("stroke", "#fff")
      .attr ("dy", ".35em")
      //.attr ("filter", "url(#background)")
      .append("textPath")
      .attr("xlink:href", (d) => {
        return "#link-" + d.id
      })
      .style("text-anchor","middle")
      .attr("startOffset", "50%")
      .text ((d: any) => {
        return d.relationship;
      });*/

    //linkLabel
    link.append ("text")
      .attr ("class", "linkLabel linkLabelGrp relationship")
      .attr ("font-size", "10px")
    //  .attr ("dy", ".35em")
      //.attr ("filter", "url(#background)")
      .append("textPath")
      .attr("xlink:href", (d) => {
        return "#link-" + d.id
      })
      .style("text-anchor","middle")
      .attr("startOffset", "50%")
      .text ((d: any) => {
        return d.relationship;
      });
    /*
    link.append ("text")
      .attr ("class", "linkLabel linkLabelGrp relationship")
      .attr ("font-size", "10px")
      .attr ("x", -20)
      .attr ("dy", ".35em")
      // .attr("filter", "url(#solid)")
      .text ((d: any) => {
        return d.relationship;
      })
      .call (this.getTextBox);
*/

    //linkBoundBox: https://bl.ocks.org/mbostock/1160929
/*    link.insert ("rect", "text")
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
      });*/

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


  private removeNodeFromGraph: any = (removedNodeId) => {
    let nodes = this.data.nodes;
    let links = this.data.links;
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id == removedNodeId) {
        nodes.splice(i, 1);
      }
    }
    //expensive one

    let indicesToRemove: Array<number> = [];

    for(let i=0;i<links.length;i++){
      if(links[i].source.id===removedNodeId || links[i].target.id === removedNodeId){
        indicesToRemove.push(i);
      }
    }

    for (let j = indicesToRemove.length -1; j >= 0; j--){
      links.splice(indicesToRemove[j],1);
    }
  }

  private countLinks: any = (d) => {

    let sourceId: number = d.source.id;
    let targetId: number = d.target.id;
    let links = this.data.links;
    let availableLinks = [];

    //go through all links and find similar ones in regards of source and target
    for (let i = 0; i < links.length; i++) {
      if (links[i].source.id === sourceId && links[i].target.id === targetId) {
        availableLinks.push(
          links[i].id //get the id of the link object from this.data.nodes
        )
      }
    }

    //find index of current node in available links for given node
    let curIdx = availableLinks.indexOf(d.id);

    let dx: number = d.target.x - d.source.x,
      dy: number = d.target.y - d.source.y,
      dr: number = Math.sqrt(dx * dx + dy * dy) / (1 + curIdx * 0.5);// setting up a simple coefficient that would
    // create an angle for any additional relationships when we have more than two. inefficient as we do this
    // also for straight links.
    let dAttribute: string;

    function leftOrRight (curIdx) {
      if (curIdx % 2 == 0) {
        //console.log("0 for " + id + "at index " + availableLinks.indexOf(id));
        return 0
      }
      else {
        //console.log("1 for " + id+ "at index " + availableLinks.indexOf(id));
        return 1
      }
    }

    // build links. if available links array bigger than 1, make curves.
    if (availableLinks.length > 1) {
      dAttribute = "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0," + leftOrRight(curIdx) + " " + d.target.x + "," + d.target.y;
    }
    else {
      dAttribute = "M" + d.source.x + "," + d.source.y + "L" + d.target.x + "," + d.target.y;
    }
    return dAttribute




  };

  getTextBox (selection) {
    selection.each (function (d) {
      d.bbox = this.getBBox();
    })
  }

  private removeRadialMenu: any =  () => {
    d3.selectAll (".rm").remove ();
  }

  private fixNode: any = (d: any) => {
    d.fx = d.x;
    d.fy = d.y;
  }

  private unfixNode: any = (d: any) => {
    d.fx = d.fy = null;
  }

  private showTooltip: any = (d, containerStyle: string, fadeInMils: number ) => {
    let tooltipContainer = d3.select (containerStyle);
    let tooltipContainerWithContent = d3.select (containerStyle + ", " + containerStyle + " *");
    tooltipContainer.transition()
    .delay (fadeInMils)
    .duration (200)
    .style ("opacity", 1.0);
    tooltipContainer.html (this.getTooltipText (d))
      .style ("left", (d3.event.pageX + 20) + "px")
      .style ("top", (d3.event.pageY - 28) + "px");

    tooltipContainerWithContent
      .on("mouseover", (d) => {
        console.log("over tooltip container");
        console.log("tooltip: " + this.tooltipFocus);
        console.log("node: " + this.nodeFocus);
         this.tooltipFocus = true;
         console.log ("value - " + this.tooltipFocus);
      })
      .on ("mouseout", (d) => {
        this.hideTooltip (".tooltip");
        this.tooltipFocus = false;
      })

  }

  private hideTooltip: any = (containerStyle: string) => {
    let tooltipContainer = d3.select (containerStyle)
    if ( this.tooltipFocus === false && this.nodeFocus === false ) {
      tooltipContainer.transition ()
        .style ("left", "0px")
        .style ("top", "0px")
        .duration (100)
        .style ("opacity", 0);
    }
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

  private outboundNodesClicked: any = (d: any) => {
    this.graph.getOutboundNodes (d.id).subscribe (newData => {
      this.addToGraph (newData);
      this.restart ();
    });
  }

  private InboundNodesClicked: any = (d: any) => {
    this.graph.getInboundNodes (d.id).subscribe (newData => {
      this.addToGraph (newData);
      this.restart();
    });
  }

  private removeNodesClicked: any = (removedNode: any) => {
    this.removeNodeFromGraph (removedNode.id);
    this.restart();
  }

  private dragstarted: any = (d: any) => {
    if (!d3.event.active) this.simulation.alphaTarget (0.9).restart();
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
