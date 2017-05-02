var PathNet = {
    createInstance: function (domId) {
        var dom = document.getElementById(domId);
        var width = dom.getBoundingClientRect().width;
        var height = dom.getBoundingClientRect().height;

        var margin = { top: 20, right: 20, bottom: 50, left: 20 },
            width = width - margin.left - margin.right,
            height = height - margin.top - margin.bottom;
        var maxX = 0, maxY = 0;
        var xScale = window.location.search.match(/(?:xscale=)(\*|[0-9.]+)/g);
        xScale = xScale ? xScale[0].split('=')[1] : 1;

        var yScale = window.location.search.match(/(?:yscale=)(\*|[0-9.]+)/g);
        yScale = yScale ? Number(yScale[0].split('=')[1]) : 1;

        var maxnodecount = 0, maxlinkcount = 0;
        var color = d3.scaleOrdinal(d3.schemeCategory20c);
        var graycolor = d3.scaleLinear()
            .domain([0, 3])
            .range(["rgba(50,50,50,1)", "rgba(180,180,180,0.3)"])
            .interpolate(d3.interpolateHcl);
        var redcolor = d3.scaleLinear()
            .domain([0, 3])
            .range(["rgba(200,10,10,1)", "rgba(255,200,200,0.3)"])
            .interpolate(d3.interpolateHcl);
        // var morecolor = d3.scaleLinear()
        //     .domain([-1, 30])
        //     .range(["rgb(80%,100%,80%)", "rgb(10%,80%,10%)"])
        //     .interpolate(d3.interpolateHcl);
        // var lesscolor = d3.scaleLinear()
        //     .domain([-1, 30])
        //     .range(["rgb(100%,80%,80%)", "rgb(80%,10%,10%)"])
        //     .interpolate(d3.interpolateHcl);

        var svg = d3.select('#' + domId).append("svg")
            .attr("id", "netsvg")
            .attr("width", width + margin.right + margin.left)
            .attr("height", height + margin.top + margin.bottom)
        svg.style('top', 70);
        svg.style('position', 'absolute');
        svg = svg.append("g")
            .attr("transform", "translate("
            + margin.left + "," + margin.top + ")");

        // var background = svg
        //     .append("rect")
        //     .attr("class", "view")
        //     .attr("id", "backgroundId")
        //     .attr("fill", "white")
        //     .attr("x", 0.5)
        //     .attr("y", 0.5)
        //     .attr("width", width + margin.right + margin.left)
        //     .attr("height", height + margin.top + margin.bottom)
        //     .on("click", function () { console.log('mouse click') });

        // var zoom = d3.zoom()
        //     .on("zoom", function () {
        //         handleZoom(svg)
        //     });
        // background.call(zoom);


        let graphLinksGroup = svg.append("g")
            .attr("class", "links");
        let graphNodesGroup = svg.append("g")
            .attr("class", "nodes");
        var node,
            link,
            text,
            circle;

        var simulation = d3.forceSimulation()
            .force("link", d3.forceLink().id(function (d, i) {
                return d.name;
            }).distance(function (d) {
                return 100
            }).strength(0.01))
            .force("gravity", function (d) {
                return 0
            })
            .force("charge", function (d) {
                return -100
            })
            .force("collide", d3.forceCollide(function (d) {
                var r = Math.sqrt(Math.sqrt(d.count / (maxnodecount)));
                r = Math.max(2.5, Math.round(r * 30));
                return 2 * r
            }).iterations(16))
            .force("center", d3.forceCenter(width / 2, height / 2));

        var root, links = [], nodes = [], nodesMap = {}, linksMap = {};
        var pathnet = {};


        pathnet.loadData = function (root, steps, batch, origin, diff) {
            difforigin = diff;
            var me = this;
            d3.json("/kitchen", function (err, data) {
                if (!err) me.setData(data);
            }).header("Content-Type", "application/json")
                .send("POST", JSON.stringify({ 'dish': 'treelike', 'rootkey': root, 'granularity': steps, 'batch': batch, 'origins': origin }));
            return this;
        }

        pathnet.setData = function (data) {
            this.rootNode = root = d3.hierarchy(data)
                .sort(function (a, b) {
                    return b.data.count - a.data.value;
                });

            // treeToLinksNodes(root);
            // update(links, nodes);
            this.updateEntry([]);
        };

        pathnet.updateEntry = function (arr) {
            var c, n = this.rootNode, cn = [this.rootNode];
            while (c = arr.shift()) {
                for (var i = 0; i < cn.length; i++) {
                    if (cn[i].data.key === c) {
                        if (arr.length === 0) {
                            n = cn[i];

                        }
                        cn = cn[i].children;
                        break;
                    }
                }
            }
            var entry = d3.hierarchy(n.data)
                .sort(function (a, b) {
                    return b.data.value - a.data.value;
                });
            treeToLinksNodes(entry, 3);
            update(links, nodes);
            simulation.restart();
            simulation.alpha(1);
            zoomDisplay();
        };

        function treeToLinksNodes(tree, maxdepth) {
            links.length = 0;
            nodes.length = 0;
            nodesMap = {};
            linksMap = {};
            maxX = maxY = 0;
            var treeNodes = tree.descendants();
            treeNodes.forEach(function (treenode) {
                var item = treenode.data;
                var itemkey = item.key;
                // if (itemkey === "mail.compose.to.input") debugger;
                // if (item.count<1) return;
                if (!nodesMap[itemkey]) {
                    nodes.push(nodesMap[itemkey] = { id: itemkey, name: itemkey, count: item.count, isLeaf: !item.children, depth: treenode.depth, origincounts: item.origincounts });
                    nodesMap[itemkey].fx = item.pos.x;
                    nodesMap[itemkey].fy = item.pos.y;
                    nodesMap[itemkey].fixed = true;

                } else {
                    for (var att in item.origincounts) {
                        if (!nodesMap[itemkey].origincounts[att]) {
                            nodesMap[itemkey].origincounts[att] = 0;
                        }
                        nodesMap[itemkey].origincounts[att] += item.origincounts[att];
                    }

                    const sumx = (item.pos.x * item.count + nodesMap[itemkey].fx * nodesMap[itemkey].count);
                    const sumy = (item.pos.y * item.count + nodesMap[itemkey].fy * nodesMap[itemkey].count)
                    nodesMap[itemkey].count += item.count;
                    nodesMap[itemkey].fx = sumx / nodesMap[itemkey].count;
                    nodesMap[itemkey].fy = sumy / nodesMap[itemkey].count;

                }

                if (treenode.depth <= maxdepth) {
                    //if (nodesMap[itemkey].fx < 0) console.log("x<0", nodesMap[itemkey].fx, itemkey)
                    maxX = Math.max(maxX, nodesMap[itemkey].fx);
                    maxY = Math.max(maxY, nodesMap[itemkey].fy);
                    maxnodecount = Math.max(maxnodecount, nodesMap[itemkey].count);
                }

                if (item.children) {
                    item.children.forEach(function (citem) {
                        // if (citem.key === "mail.compose.to.input") debugger;
                        // if (citem.count>0)
                        maxlinkcount = Math.max(maxlinkcount, citem.count);

                        var linkkey = itemkey + '__link__' + citem.key;
                        if (linksMap[linkkey]) {
                            for (var att in citem.origincounts) {
                                if (!linksMap[linkkey].origincounts[att]) {
                                    linksMap[linkkey].origincounts[att] = 0;
                                }
                                linksMap[linkkey].origincounts[att] += item.origincounts[att];
                            }
                        } else {
                            var l;
                            links.push(l = { source: itemkey, target: citem.key, tgtcount: citem.count, depth: treenode.depth, origincounts: item.origincounts })
                            linksMap[linkkey] = l;
                        }


                    });
                    //treeToLinksNodes(item.children, false);
                }


            });

            links.forEach(function (link) {
                var orgindiff = 0;
                if (difforigin) {
                    if (!link.origincounts[difforigin]) {
                        orgindiff = -1;
                    } else {
                        var more = true;
                        for (var att in link.origincounts) {
                            if (att !== difforigin) more = false;
                        }
                        if (more) orgindiff = 1;
                    }
                }
                link.origindiff = orgindiff;
                link.targetNode = nodesMap[link.target];
                link.sourceNode = nodesMap[link.source];

            });

            nodes.forEach(function (nd) {
                nd.fx = Math.max(0, nd.fx*xScale);
                nd.fy= Math.max(0, nd.fy*yScale);

                var orgindiff = 0;
                if (difforigin) {
                    if (!nd.origincounts[difforigin]) {
                        orgindiff = -1;
                    } else {
                        var more = true;
                        for (var att in nd.origincounts) {
                            if (att !== difforigin) more = false;
                        }
                        if (more) {
                            orgindiff = 1;
                        }
                    }
                }
                nd.origindiff = orgindiff;
            });


        }

        function update(links, nodes) {

            var marker = svg.append("defs")
                .attr("class", "defs")
                .selectAll("marker")
                .data(links)
                .attr("id", function (d) { return ('marker-' + d.source + "-" + d.target) });


            var markerEnter = marker.enter()
                .append("svg:marker")
                .attr("id", function (d) { return ('marker-' + d.source + "-" + d.target) })
                .attr("viewBox", "0 -5 10 10")
                .attr("refX", function (d) {
                    var c = Math.max(0.1, d.tgtcount * 10 / maxlinkcount);
                    return c > 1 ? 5 : 0;
                })
                .attr("refY", 0)
                .attr("markerWidth", function (d) {
                    var c = Math.max(0.1, d.tgtcount * 10 / maxlinkcount);
                    return c > 1 ? 3 : (5 / c);
                })
                .attr("markerHeight", function (d) {
                    var c = Math.max(0.1, d.tgtcount * 10 / maxlinkcount);
                    return c > 1 ? 3 : (5 / c);
                })
                .attr("orient", "auto")
                .append("svg:path")
                .attr("d", "M0,-5L10,0L0,5")
                .style("fill", linkStroke);

            marker.exit().remove();

            link = graphLinksGroup.selectAll("path")
                .data(links, function (d) { return d.source + "-" + d.target; });

            var linkEnter = link
                .enter()
                .append("path")
                .attr("class", "enter")
                .style("fill", 'none')
                .style("stroke-width", function (d) {
                    var c = Math.max(0.1, d.tgtcount * 15 / maxlinkcount);
                    return c;
                })
                .style("stroke", linkStroke)
                .attr("marker-end", function (d) { return "url(#marker-" + (d.source + "-" + d.target) + ")"; })


            var linkExit = link.exit().remove();

            link = linkEnter.merge(link);

            node = graphNodesGroup.selectAll("g")
                .data(nodes, function (d) {
                    return d.id;
                });

            var nodeEnter = node.enter()
                .append("g")
                .attr("id", function (d) { return d.id })
                // .attr("class", "node")
                //.on("click", click)
                .call(d3.drag()
                    .on("start", dragstarted)
                    .on("drag", dragged)
                    .on("end", dragended));

            var nodeExit = node.exit().remove();

            nodeEnter.append("circle")
                .classed('node', true);


            text = nodeEnter.append("text")
                .classed('node', true);


            node = nodeEnter.merge(node);

            circle = node.select('circle.node')
                .attr("cursor", "pointer")
                .attr("r", function (d) {
                    var r = Math.sqrt(Math.sqrt(d.count / (maxnodecount)));
                    return Math.max(1.5, Math.round(r * 30));
                }).style("fill", function (d) {
                    return d.depth=== 0 ? '#000' :color(d.id);
                })
                .style('fill-opacity', function(d){
                        return Math.max(5-d.depth)/4;
                })
                .style("stroke-width", strokeWidth)
                .style("stroke", stroke)
                .on('mouseover', function (d) {
                    handleMouseoverNode(d);
                    text.text(updateText);
                    circle.style("stroke-width", strokeWidth);
                    circle.style("stroke", stroke);
                    link.style("stroke", linkStroke);
                    marker.style("fill", linkStroke);
                })
                .on('mouseout', function (d) {
                    handleMouseoutNode(d);
                    //text.text(updateText);
                    //circle.style("stroke-width", strokeWidth)
                    //circle.style("stroke", stroke)
                });

            text = node.select('text.node')
                .attr("id", function (d) { return d.id })
                .attr("dy", function (d) {
                    var r = Math.sqrt(Math.sqrt(d.count / (maxnodecount)));
                    return 10 + Math.max(1.5, Math.round(r * 30));
                })
                // .attr("dx", function (d) {
                //     var r = Math.sqrt(Math.sqrt(d.count / (maxnodecount)));
                //     return -Math.max(1.5, Math.round(r * 30));
                // })
                .style("font", '12px "Helvetica Neue", Helvetica, Arial, sans-serif')
                .style("text-anchor", 'middle')
                .style("fill", function (d) { return graycolor(d.depth) })
                .text(updateText);

            simulation
                .nodes(nodes)
                .on("tick", ticked);

            simulation.force("link")
                .links(links);


            function ticked() {
                link.attr("d", function (d) {
                    var pos = linkpos(d);
                    var linkkey = d.target.id + "__link__" + d.source.id;
                    if (linksMap[linkkey]) {
                        return "M" + pos.x1 + "," + pos.y1 + "A" + 2 * pos.dr + "," + 2 * pos.dr + " 0 0,1 " + pos.x2 + "," + pos.y2;
                    } else {
                        return "M" + pos.x1 + "," + pos.y1 + "A" + 0 + "," + 0 + " 0 0,1 " + pos.x2 + "," + pos.y2;
                    }
                })


                node.attr("transform", function (d) {
                    return "translate(" + d.x + ", " + d.y + ")";
                });


            }
        }

        function updateText(d) {
            // return d.name;
            return (d.selected || d.depth <= 1) ? d.name : '';
        }

        function linkStroke(d) {
            return d.targetNode.mouseoverNode || d.sourceNode.mouseoverNode ? redcolor(d.sourceNode.depth) : graycolor(d.sourceNode.depth);
        }

        function stroke(d) {
            var c = d.count * 30 / maxnodecount;
            return redcolor(d.depth) //d.origindiff === 0 ? color(c) : (d.origindiff > 0 ? morecolor(c) : lesscolor(c));
        }
        function strokeWidth(d) {
            if (d.mouseoverNode) return 3;
            if (d.selected) return 1.5;

            // if (d.isRoot) return 0;
            // if (d.isLeaf) return 0;
            // if (!d.selected) return 0;

            return 0;//d.origindiff === 0 ? color(c) : (d.origindiff > 0 ? morecolor(c) : lesscolor(c));
        }

        function linkpos(d) {

            var r1 = Math.sqrt(Math.sqrt(d.source.count / maxnodecount));
            r1 = Math.max(1.5, Math.round(r1 * 30));

            var r2 = Math.sqrt(Math.sqrt(d.target.count / maxnodecount));
            r2 = 5 + Math.max(1.5, Math.round(r2 * 30));

            var dx = d.target.x - d.source.x;
            var dy = d.target.y - d.source.y;
            dr = Math.round(Math.sqrt(dx * dx + dy * dy));

            if (dr === 0) return { x1: 0, y1: 0, x2: 0, y2: 0, dr: 0 }

            var x1 = Math.round(d.source.x + dx * r1 / dr);
            var y1 = Math.round(d.source.y + dy * r1 / dr);
            var x2 = Math.round(d.target.x - dx * r2 / dr);
            var y2 = Math.round(d.target.y - dy * r2 / dr);

            return { x1: x1, y1: y1, x2: x2, y2: y2, dr: dr };
        }



        function dragstarted(d) {
            if (!d3.event.active) simulation.alphaTarget(0.3).restart()
        }

        function dragged(d) {
            d.fx = d3.event.x;
            d.fy = d3.event.y;
        }

        function dragended(d) {
            if (!d3.event.active) simulation.alphaTarget(0);
            if (!d.fixed) {
                d.fx = undefined;
                d.fy = undefined;
            }

        }

        function handleMouseoverNode(d) {
            d.mouseoverNode = true;
            links.forEach(function (lnk) {
                var issel = lnk.targetNode.name === d.name || lnk.sourceNode.name === d.name;
                if (issel) {
                    lnk.targetNode.selected = lnk.sourceNode.selected = issel;
                }
            })
        }

        function handleMouseoutNode(d) {
            d.mouseoverNode = false;
            links.forEach(function (lnk) {
                lnk.targetNode.selected = lnk.sourceNode.selected = false;
            })
        }

        function zoomDisplay() {
            var scale = Math.min(width / maxX, height / maxY);
            svg.attr("transform",
                'translate(0,0)' + " " +
                'scale(' + scale + ')');
        }

        function handleZoom(svgGroup) {
            svgGroup
                .attr("transform",
                `translate(${d3.event.transform.x}, ${d3.event.transform.y})` + " " +
                `scale(${d3.event.transform.k})`);
        }

        return pathnet;
    }

};