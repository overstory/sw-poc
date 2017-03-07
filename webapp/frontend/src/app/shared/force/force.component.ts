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
      .on ("tick", () => {

        this.nodesGrp.selectAll (".nodeContainer")
          .attr ("transform", (d) => {
            return "translate(" + d.x + "," + d.y + ")";
          });

        this.linksGrp.selectAll (".link")
          .attr ("d", (d) => {
            let
              sourceCoordinate: string = d.source.x + "," + d.source.y,
              targetCoordinate: string = d.target.x + "," + d.target.y,
              dx: number = d.target.x - d.source.x,
              dy: number = d.target.y - d.source.y,
              //angle: number = Math.atan((d.source.y - d.target.y) / (d.source.x - d.target.x)) * 180 / Math.PI,
              dr: number = Math.sqrt (dx * dx + dy * dy) / (0.4 + d.curvature * 0.15);
            let dAttribute: string;
            // build links. if isCurved property == true, make curves.
            if (d.isCurved) {
              //dAttribute = "M" + sourceCoordinate + "A" + dr + "," + dr + " 0 0," + d.curvedirection + " " + targetCoordinate
              dAttribute = this.drawArcedPath (sourceCoordinate, targetCoordinate, dr, d.curvedirection, false);
            }
            else {
              //dAttribute = "M" + sourceCoordinate + "L" + targetCoordinate;
              dAttribute = this.drawLinePath(sourceCoordinate, targetCoordinate, false);
            }
            return dAttribute
          });

        this.linksGrp.selectAll (".invisible")
          .attr ("d", (d) => {
            let
              sourceCoordinate: string = d.source.x + "," + d.source.y,
              targetCoordinate: string = d.target.x + "," + d.target.y,
              direction: any = d.curvedirection,
              dx: number = d.target.x - d.source.x,
              dy: number = d.target.y - d.source.y,
              angle: number = (Math.atan2 (dy, dx) + 0.5 * Math.PI ) * 180 / Math.PI, //use atan2 function and move calculations 90degrees clockwise
              dr: number = Math.sqrt (dx * dx + dy * dy) / (0.4 + d.curvature * 0.15);
            let dAttribute: string;
            // build links. if isCurved property == true, make curves.
            if (0 <= angle && angle < 180) {
              if (d.isCurved) {
                //dAttribute = "M" + sourceCoordinate + "A" + dr + "," + dr + " 0 0," + d.curvedirection + " " + targetCoordinate
                dAttribute = this.drawArcedPath (sourceCoordinate, targetCoordinate, dr, direction, false);
              }
              else {
                //dAttribute = "M" + sourceCoordinate + "L" + targetCoordinate;
                dAttribute = this.drawLinePath (sourceCoordinate, targetCoordinate, false);
              }
            } else {
              if (d.isCurved) {
                let inverseDirection =  function(d) {if (direction == 1) {return 0 } else { return 1}}; //flip small sweep around
                //dAttribute = "M" + targetCoordinate + "A" + dr + "," + dr + " 0 0," + inverseDirection(d) + " " + sourceCoordinate;
                dAttribute = this.drawArcedPath (sourceCoordinate, targetCoordinate, dr, inverseDirection(d), true);
              }
              else {
                //dAttribute = "M" + targetCoordinate + "L" + sourceCoordinate;
                dAttribute = this.drawLinePath (sourceCoordinate, targetCoordinate, true);
              }
            }
            return dAttribute
          });
      });

    // Define the div for the tooltip
    let body = d3.select ("body")
      .on ("keydown", keyDown)
      .on ("keyup", keyUp)
      .on ("mouseenter", bodyMouseEnter);

    body.append ("div")
      .attr ("class", "tooltip")
      .style ("opacity", 0);

    svg.call (
      d3.zoom().scaleExtent ([this.minZoom, this.maxZoom]).on ("zoom", () => {
        d3.select ("#chart").attr ("transform", d3.event.transform)
      })
    ).on ("click", (d) => {
      this.removeSelection(".rm");
      this.radialMenuToggle = null;
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
        .on ("dblclick", (d:any ) => {
          this.outboundNodesClicked(d);
          this.unfixNode(d);
        })
        // .on ("contextmenu", contextMenu)
        .call (d3.drag ()
          .on ("start", this.dragstarted)
          .on ("drag", this.dragged)
          .on ("end", this.dragended)
        )
        .merge (this.nodeSelector)
        // make sure that current node is on top of others. this is mainly for radial menu
        .on('mouseover', function(d, o, i) {
          let curSelection = d;
          this.parentNode.appendChild (this);

          halo.attr("transform", function(o) {
            let connected: boolean = isConnected(d, o),
              scale = connected ? 1.3 : 1.0;
            return "scale(" + scale + ")"
          });

          outerCircle.attr( "transform", function(o) {
            let connected: boolean = isConnected(d, o),
              scale = connected ? 1.3 : 1.0;

            return "scale(" + scale + ")"
          });

          innerCircle.attr("transform", function(o) {
            let connected: boolean = isConnected(d, o),
              scale = connected ? 1.3 : 1.0;

            return "scale(" + scale + ")"
          });

          nodeImg.attr("transform", function(o) {
            let connected: boolean = isConnected(d, o),
              scale = connected ? 1.3 : 1.0;

            return "scale(" + scale + ")"
          });

          innerText.attr("transform", function(o) {
            let connected: boolean = isConnected(d, o),
              scale = connected ? 1.3 : 1.0;

            return "scale(" + scale + ")"
          });

          node.attr("opacity", function(o) {
            let connected: boolean = isConnected(d, o),
              opacity = connected ? "2.0": "0.6";
            return opacity
          });

          node.attr ("class", function(o) {
            let connected: boolean = isConnected(d, o),
              classes = connected ? "node nodeContainer associated": "node nodeContainer";
            return classes
          });


          link.attr("opacity", function(d) {
            let connected = function(d, o) {
                if (d.source.index == curSelection.index || d.target.index == curSelection.index) { return true} else { return false}
              },
              opacity = connected(d, o) ? "3.0": "0.15";
            return opacity
          });


        })
        .on("mouseout", (d) => {
          d3.selectAll ("circle, .node-text, image").attr("transform", "scale(1.0)");
          d3.selectAll ("g").attr ("opacity", "1.0");
          d3.selectAll (".nodeContainer"). attr ("class", "node nodeContainer"); // revert back to normal classes
          //this.removeSelection (".small-tooltip");
        })
      ;

    node.append ("text")
      .attr ("class", "node small-tooltip small-tooltip-text")
      .attr ("dy", ".35em")
      .attr ("y", -45)
      .text ((d:any) => {return d.name});

    let halo = node.append ("circle")
      .attr ("class", "node halo")
      .style ("stroke-width", "12px")
      .attr ("r", this.nodeRadius);

    //circle with a opaque fill so that lines in background are not visible
    let outerCircle = node.append ("circle")
      .attr ("class", "node")
      .attr ("r", this.nodeRadius)
      .style ("fill", "#eee");

    //main node
    let innerCircle = node.append ("circle")
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
    let innerText = node.append ("text")
      .attr ("class", "node node-text")

      .text ((d: any) => {
        return d.name;
      })
      .attr ("text-anchor", "middle")
      .attr ("dy", ".35em")
      .attr ("clip-path", "url(#circle-view)");

    //node image
    let nodeImg = node.append ("image")
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
      .on ("click", (d) => {
        if (this.radialMenuToggle != d.id) {
          //there is a probably better way to dd this but this.parentNode didn't work for me
          this.removeSelection (".rm");
          d3.event.stopPropagation();
          this.fixNode (d);
          let parent = d3.select (node.nodes ()[d.index]);

          let northwest =  parent.append ("g")
            .attr ("class", "rm radialMenuContainer");
          northwest.append ("path")
            .attr ("d", "M -9.184850993605149e-15 -50 A 50 50 0 0 0 -47.27592877996584 -16.27840772285784")
            .attr("stroke-width", "20")
            .attr ("class", "rm radial-menu")
            .on ("click", (d) => {
              this.outboundNodesClicked(d);
              this.fixNode (d);
              this.removeSelection (".rm");
            });
          northwest.append ("text")
            .attr ("class", "rm radial-menu-text")
            .attr ("text-anchor", "middle")
            .attr ("transform", "translate(-35,-35)rotate(45)")
            .text ("⬅")
            .on ("click", (d) => {
              this.outboundNodesClicked(d);
              this.fixNode (d);
              this.removeSelection (".rm");
            });

          let northeast = parent.append ("g")
            .attr ("class", "rm radialMenuContainer");
          northeast.append ("path")
            .attr("d", "M 47.81523779815177 -14.618585236136838 A 50 50 0 0 0 0.8726203218641688 -49.992384757819565")
            .attr ("class", "rm radial-menu")
            .on ("click", (d) => {
              this.InboundNodesClicked(d);
              this.fixNode (d);
              this.removeSelection (".rm");
            });
          northeast.append ("text")
            .attr ("class", "rm radial-menu-text")
            .attr ("text-anchor", "middle")
            .attr ("transform", "translate(35,-35)rotate(-45)")
            .text ("⬅")
            //.text("⬇")
            .on ("click", (d) => {
              this.InboundNodesClicked(d);
              this.fixNode (d);
              this.removeSelection (".rm");
            });

          let southeast = parent.append ("g")
            .attr ("class", "rm radialMenuContainer");
          southeast.append ("path")
            .attr ("d", "M 29.389262614623657 40.45084971874737 A 50 50 0 0 0 47.81523779815177 -14.618585236136838")
            .attr ("class", "rm radial-menu")
            .on("click", (d) => {
              this.showTooltip(d, ".tooltip", 0);
              this.fixNode (d);
              this.removeSelection (".rm");
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
              this.removeSelection (".rm");
            });


          let southwest = parent.append ("g")
            .attr ("class", "rm radialMenuContainer");
          southwest.append ("path")
            .attr ("d", "M -29.38926261462365 40.45084971874737 A 50 50 0 0 0 28.678821817552304 40.95760221444959")
            .attr ("class", "rm radial-menu")
            .on ("click", (d) => {
              this.removeNodesClicked(d);
              this.fixNode (d);
              this.removeSelection (".rm");
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
              this.removeSelection (".rm");
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
            .text ( (d) => { return '\uf09c' })
            .on("click", (d) => {
              this.unfixNode (d);
            });

          this.radialMenuToggle = d.id;
        } else {
          //toggle id and id clicked next is exactly the same,
          // hence the same node was clicked again
          this.removeSelection (".rm");
          this.fixNode (d);
          this.radialMenuToggle = null;
        }
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


    link.append ("path")
      .attr ("class", "relationship invisible")
      .attr("id", (d) => {
        return "link-" + d.id
      });

     link.append ("path")
       .attr ("class", "link relationship halo")
       .style ("stroke-width", "20");



    //linkLine
    link.insert ("path", "rect")
      .attr ("class", "linkLine link relationship")
      .attr ("marker-end", "url(#end)");


    //linkLabel
    link.append ("text")
      .attr ("class", "linkLabel linkLabelGrp relationship")
      .attr ("font-size", "10px")
      .attr ("dy", "-.275em")
      .append("textPath")
      .attr("xlink:href", (d) => {
        return "#link-" + d.id
      })
      .style("text-anchor","middle")
      .attr("startOffset", "50%")
      .text ((d: any) => {
        return d.relationship;
      });

    //this.showObjects ();
    console.log (this.data.nodes);
    console.log (this.data.links);

    // Update and restart the simulation.
    this.simulation.nodes (this.data.nodes);
    this.simulation.force ("link").links (this.data.links);
    this.calculateLinksCurvature();
    this.simulation.alpha (1).restart();

    var linkedByIndex = {};
    this.data.links.forEach(function(d) {
      linkedByIndex[d.source.index + "," + d.target.index] = 1;
    });
    
    function isConnected(a, b) {
      return linkedByIndex[a.index + "," + b.index] || linkedByIndex[b.index + "," + a.index] || a.index == b.index;
    }

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

  private drawArcedPath: any = (
    sourceCoordinate: number,
    targetCoordinate: number,
    arcRadius: number,
    arcDirection: number,
    isInverse: boolean
  ) => {
    let dAttribute: string;

    if (isInverse) {
      dAttribute = "M" + targetCoordinate + "A" + arcRadius + "," + arcRadius + " 0 0," + arcDirection + " " + sourceCoordinate;
    } else {
      dAttribute = "M" + sourceCoordinate + "A" + arcRadius + "," + arcRadius + " 0 0," + arcDirection + " " + targetCoordinate;
    }
    return dAttribute
  }

  private drawLinePath: any = (
    sourceCoordinate: number,
    targetCoordinate: number,
    isInverse: boolean
  ) => {
    let dAttribute: string;

    if (isInverse) {
      dAttribute = "M" + targetCoordinate + "L" + sourceCoordinate;
    } else {
      dAttribute = "M" + sourceCoordinate + "L" + targetCoordinate;
    }
    return dAttribute
  }

  private calculateLinksCurvature: any = () => {
    //we have to redo all links upon every restart
    let links = this.data.links,
      sourceId: number,
      targetId: number,
      curId: number,
      availableLinks: Array<number> = [];

    //go through all links and find similar ones in regards of source and target
    for (let j = 0; j < links.length; j++) {

      sourceId= links[j].source.id;
      targetId = links[j].target.id;
      curId = links[j].id;
      availableLinks = [];

      for (let i = 0; i < links.length; i++) {
        if (links[i].source.id === sourceId && links[i].target.id === targetId) {
          availableLinks.push (
            links[i].id //get the id of the link object from this.data.nodes
          )
        }
      }


      let curIdx: number = parseInt(availableLinks.indexOf(curId).toString());
      let curvature: number = curIdx / 2 + 1;

      // only add these properties if it is not supposed to be straight line
      if (availableLinks.length > 1) {
        links[j].isCurved = true;
        links[j].curvature = curIdx;
        links[j].curvedirection = leftOrRight (curIdx);
      }

      else {
        links[j].isCurved = false;
      }

    }

    function leftOrRight (curIdx) {
      if (curIdx % 2 == 0) {
        return 0
      }
      else {
        return 1
      }
    }
  }

  getTextBox (selection) {
    selection.each (function (d) {
      d.bbox = this.getBBox();
    })
  }

  private removeSelection: any =  (selection: string) => {
    d3.selectAll (selection).remove();
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
    ///let tooltipContainerWithContent = d3.select (containerStyle + ", " + containerStyle + " *");
    let closeButton = d3.select (".close-tooltip-button");
    tooltipContainer.transition()
      .delay (fadeInMils)
      .duration (200)
      .style ("opacity", 1.0)
      .style ("pointer-events", "auto"); // turn on pointer events
    tooltipContainer.html (this.getTooltipText (d))
      .style ("left", (d3.event.pageX + 20) + "px")
      .style ("top", (d3.event.pageY - 28) + "px");

    tooltipContainer.selectAll ("a")
      .on("click", (d) => {
        this.hideTooltip (".tooltip");
      })

  }

  private hideTooltip: any = (containerStyle: string) => {
    let tooltipContainer = d3.select (containerStyle)
      tooltipContainer.transition ()
        .style ("pointer-events", "none") //turn off pointer events as we want to click on nodes through when this is hidden
        .duration (100)
        .style ("opacity", 0);
  }


  private getTooltipText: any = (data) => {
    let html = '<a class="btn-floating btn waves-effect waves-light teal close-tooltip-button right">&#10006;</a>';
    //let html = '<a class="waves-effect waves-light btn close-tooltip-button right">&#10006;</a>';
      html += '<h2 class="tooltip-name">' + data.group + ": " + data.name + '</h2>';

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
