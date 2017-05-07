var EffectivenessSankey = {
    createInstance: function (domId) {
        var dom = document.getElementById(domId);
        var width = dom.getBoundingClientRect().width;
        var height = dom.getBoundingClientRect().height;

        var margin = { top: 50, right: 20, bottom: 50, left: 10 },
            width = width - margin.left - margin.right,
            height = height - margin.top - margin.bottom;

        var svg = d3.select('#' + domId).append("svg")
            .attr("width", width + margin.right + margin.left)
            .attr("height", height + margin.top + margin.bottom)

        var leftwidth = width / 2, rightwidth = width / 2;
        var leftg = svg.append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
            .attr("width", leftwidth)
            .attr("height", height);

        var radius = Math.min(rightwidth, height) / 2.5;
        var rightg = svg.append("g")
            .attr("transform", "translate(" + (leftwidth + rightwidth / 2) + "," + (margin.top + height / 2) + ")");

        var pie = d3.pie()
            .sort(null)
            .value(function (d) { return d.value; });

        var piepath = d3.arc()
            .outerRadius(radius - 10)
            .innerRadius(0);

        var label = d3.arc()
            .outerRadius(radius + 10)
            .innerRadius(radius + 0);

        var exittext = rightg.append("text")
            .attr("x", function (d) {
                return -rightwidth/2 + 20;
            })
            .attr("y", function (d) {
                return -height/2+10;
            })
            .style("font", '12px "Helvetica Neue", Helvetica, Arial, sans-serif')
            .style("fill", '#222');

        var ellipsis = leftg.append("text")
            .attr("x", function (d) {
                return leftwidth / 4;
            })
            .attr("y", function (d) {
                return 10;
            })
            .attr("dy", ".35em")
            .style("fill", '#222')
            .attr("text-anchor", function (d) {
                return "middle";
            });

        
            

        color = d3.scaleOrdinal(d3.schemeCategory20);
        // Set the sankey diagram properties
        var sankey = d3.sankey()
            .nodeWidth(36)
            .nodePadding(20)
            .size([leftwidth, height]);

        var path = sankey.link();
        var getNodesAndLinks = function (data) {
            var root = d3.hierarchy(data)
            var graph = { nodes: [], links: [] };
            var leaves = root.leaves();
            var nodesmap = {};
            var linksmap = {};
            var maxValue = root.children[0].data.count;

            leaves.forEach(function (leaf) {
                var prt = leaf.parent;
                var ancestors = prt.ancestors();
                var start = ancestors[ancestors.length - 2];
                var addnode = function (node, depth) {
                    var key = node.data.key + "_" + depth;
                    node.data.depth = depth;

                    if (!nodesmap[key]) {
                        graph.nodes.push(nodesmap[key] = node.data);
                        nodesmap[key].value = 0;
                    }
                    nodesmap[key].value += node.data.count;

                }

                var addlink = function (source, target) {
                    var key = source.key + "_" + source.depth + "__" + target.key + "_" + target.depth;
                    if (!linksmap[key]) {
                        graph.links.push(linksmap[key] = { source: nodesmap[source.key + "_" + source.depth], target: nodesmap[target.key + "_" + target.depth] });
                        linksmap[key].value = 0;
                    }
                    linksmap[key].value += (target.depth === 1 ? target.count : source.count)
                }

                addnode(start, 0);
                if (start != prt) {
                    addnode(prt, 1);
                }

                addnode(leaf, 2);
                if (start != prt) {
                    addlink(start.data, prt.data);
                }

                addlink(prt.data, leaf.data);
            })

            return graph;
        }

        var effectivenesssankey = {
        };

        effectivenesssankey.loadData = function (source, target, steps, batch, origin) {
            var me = this;
            d3.json("/kitchen", function (err, data) {
                if (!err) me.setData(data);
            }).header("Content-Type", "application/json")
                .send("POST", JSON.stringify({ 'dish': 'targetSource', 'source': source, 'target': target, 'granularity': steps, 'batch': batch, 'origins': origin }));

            return this;
        }

        effectivenesssankey.setData = function (data) {
            var graph = getNodesAndLinks(data);
            this.update(graph);
        };


        effectivenesssankey.update = function (graph) {
            sankey
                .nodes(graph.nodes)
                .links(graph.links)
                .layout(32);
            // add in the links
            var link = leftg.append("g").selectAll(".link")
                .data(graph.links)
                .enter().append("path")
                .attr("class", "link")
                .attr("d", function (d) {
                    path(d)
                })
                .style("stroke", function (d) {
                    return color(d.target.key);
                })
                .style("stroke-width", function (d) { return Math.max(1, d.dy); })
                .style("stroke-opacity", 0.2)
                .sort(function (a, b) { return b.dy - a.dy; })
                .on("mouseover", function (d) {
                    d3.select(this).style("stroke-opacity", 0.5)
                })
                .on("mouseout", function (d) {
                    d3.select(this).style("stroke-opacity", 0.2)
                });

            // add the link titles
            link.append("title")
                .text(function (d) {
                    return d.source.key + (d.source.depth === 0 ? "→...→" :" → ") +
                        d.target.key + "\n" + d.target.count;
                });


            // add in the nodes
            var node = leftg.append("g").selectAll(".node")
                .data(graph.nodes)
                .enter().append("g")
                .attr("class", "node")
                .attr("transform", function (d) {
                    return "translate(" + d.x + "," + d.y + ")";
                })
                .call(d3.drag()
                    .subject(function (d) {
                        return d;
                    })
                    .on("start", function () {
                        this.parentNode.appendChild(this);
                    })
                    .on("drag", dragmove));

            // add the rectangles for the nodes
            node.append("rect")
                .attr("height", function (d) {
                    return d.dy;
                })
                .attr("width", sankey.nodeWidth())
                .style("fill", function (d) {
                    return d.color = color(d.key);
                })
                .style("stroke", function (d) {
                    return d3.rgb(d.color).darker(2);
                })
                .style("fill-opacity", 0.8)
                .style("shape-rendering", "crispEdges")
                .append("title")
                .text(function (d) {
                    return d.key + "\n" + d.value;
                });

            // add in the title for the nodes
            node.append("text")
                .attr("x", function (d) {
                    return d.depth === 2 ? -d.dy / 2 : 6 + sankey.nodeWidth();
                })
                .attr("y", function (d) {
                    return d.depth === 2 ? (d.depth === 0 ? 10 + sankey.nodeWidth() : -6) : d.dy / 2;
                })
                .attr("dy", ".15em")
                .attr("transform", function (d) {
                    return d.depth === 2 ? "rotate(-90)" : null;
                })
                .style("font", '12px "Helvetica Neue", Helvetica, Arial, sans-serif')
                .style("fill", '#222')
                .text(function (d) { return d.key; })
                //.filter(function (d) { return d.x < width / 2; })
                //.attr("x", 6 + sankey.nodeWidth())
                .attr("text-anchor", function (d) {
                    return d.depth === 2 ? "middle" : "start"
                });

            // the function for moving the nodes
            function dragmove(d) {
                d3.select(this)
                    .attr("transform",
                    "translate("
                    + d.x + ","
                    + (d.y = Math.max(
                        0, Math.min(height - d.dy, d3.event.y))
                    ) + ")");
                sankey.relayout();
                link.attr("d", path);
            }
            link.attr("d", path);
            ellipsis.text('......');

            var piedata = [];
            graph.nodes.forEach(function (item) {
                if (item.depth === 2) piedata.push(item);
            });

            var arc = rightg.selectAll(".arc")
                .data(pie(piedata))
                .enter().append("g")
                .attr("class", "arc");

            arc.append("path")
                .attr("d", piepath)
                .attr("fill", function (d) {
                    return d.data.key === 'browser.beforeunload' ? '#d00' :color(d.data.key);
                });

            arc.append("text")
                .attr("transform", function (d) {
                    return "translate(" + label.centroid(d) + ")";
                })
                .attr("dy", ".15em")
                .style("font", '12px "Helvetica Neue", Helvetica, Arial, sans-serif')
                .style("fill", function(d){
                    return d.data.key === 'browser.beforeunload' ? '#f00' : '#222';
                })
                .text(function (d) {
                    return  d.data.key === 'browser.beforeunload'? 'Frustrated Reloading!' :d.data.key;
                });

            exittext.text('Exits Distribution →');

        }

        return effectivenesssankey;
    }

};