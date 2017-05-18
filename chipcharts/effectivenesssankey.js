var EffectivenessSankey = {
    createInstance: function (domId) {
        var dom = document.getElementById(domId);
        var width = dom.getBoundingClientRect().width;
        var height = dom.getBoundingClientRect().height;

        var margin = { top: 60, right: 20, bottom: 60, left: 10 },
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
            .value(function (d) { return d.value })
            .sort(null);

        // contructs and arc generator. This will be used for the donut. The difference between outer and inner
        // radius will dictate the thickness of the donut
        var arc = d3.arc()
            .outerRadius(radius * 0.8)
            .innerRadius(radius * 0.6)
            .cornerRadius(3)
            .padAngle(0.01);

        // this arc is used for aligning the text labels
        var outerArc = d3.arc()
            .outerRadius(radius * 0.9)
            .innerRadius(radius * 0.9);
        // append the svg object to the selection
        // g elements to keep elements within svg modular
        rightg.append('g').attr('class', 'slices');
        rightg.append('g').attr('class', 'labelName');
        rightg.append('g').attr('class', 'lines');


        //================================================

        var exittext = rightg.append("text")
            .attr("x", function (d) {
                return -rightwidth / 2 + 20;
            })
            .attr("y", function (d) {
                return -height / 2 + 10;
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

        effectivenesssankey.loadData = function (source, target, steps, batch, origin, category) {
            var me = this;
            d3.json("/kitchen", function (err, data) {
                if (!err) me.setData(data);
            }).header("Content-Type", "application/json")
                .send("POST", JSON.stringify({ 'dish': 'targetSource', 'source': source, 'target': target, 'granularity': steps, 'batch': batch, 'origins': origin, 'category': category }));

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
                    return d.source.key + (d.source.depth === 0 ? "→...→" : " → ") +
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
                    return d.depth === 2 ? d.dx - sankey.nodeWidth() - 6 : 6 + sankey.nodeWidth();
                })
                .attr("y", function (d) {
                    return d.dy / 2;
                })
                .attr("dy", ".15em")
                .style("font", '12px "Helvetica Neue", Helvetica, Arial, sans-serif')
                .style("fill", '#222')
                .text(function (d) { return d.key; })
                //.filter(function (d) { return d.x < width / 2; })
                //.attr("x", 6 + sankey.nodeWidth())
                .attr("text-anchor", function (d) {
                    return d.depth === 2 ? "end" : "start"
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

            var piedata = [], totalcount = 0;;
            graph.nodes.forEach(function (item) {
                if (item.depth === 2) {
                    totalcount += item.value;
                    piedata.push(item);
                }
            });

            // add and colour the donut slices
            var piepath = rightg.select('.slices')
                .selectAll('path')
                .data(pie(piedata))
                .enter().append('path')
                .attr('fill', function (d) { 
                    return d.data.key === 'browser.beforeunload' ? '#f00' :color(d.data.key); })
                .attr('d', arc);
            // ===========================================================================================

            // ===========================================================================================
            // add text labels
            var pielabel = rightg.select('.labelName').selectAll('text')
                .data(pie(piedata))
                .enter().append('text')
                .attr('dy', '.35em')
                .style("font", '12px "Helvetica Neue", Helvetica, Arial, sans-serif')
                .style("fill", function(d){
                    return d.data.key === 'browser.beforeunload' ? '#f00' : '#222'; 
                })
                .html(updateLabelText)
                .attr('transform', labelTransform)
                .style('text-anchor', function (d) {
                    // if slice centre is on the left, anchor text to start, otherwise anchor to end
                    return (midAngle(d)) < Math.PI ? 'start' : 'end';
                });
            // ===========================================================================================

            // ===========================================================================================
            // add lines connecting labels to slice. A polyline creates straight lines connecting several points
            var polyline = rightg.select('.lines')
                .selectAll('polyline')
                .data(pie(piedata))
                .enter().append('polyline')
                .attr('points', calculatePoints)
                .style("stroke", '#ccc')
                .style("stroke-width", 2)
                 .style('fill','none');

            exittext.text('Exits Distribution →');

            // calculates the angle for the middle of a slice
            function midAngle(d) { return d.startAngle + (d.endAngle - d.startAngle) / 2; }

            // calculate the points for the polyline to pass through
            function calculatePoints(d) {
                // see label transform function for explanations of these three lines.
                var pos = outerArc.centroid(d);
                pos[0] = radius * 0.9 * (midAngle(d) < Math.PI ? 1 : -1);
                return [arc.centroid(d), outerArc.centroid(d), pos]
            }

            function labelTransform(d) {
                // effectively computes the centre of the slice.
                // see https://github.com/d3/d3-shape/blob/master/README.md#arc_centroid
                var pos = outerArc.centroid(d);

                // changes the point to be on left or right depending on where label is.
                pos[0] = radius * 0.95 * (midAngle(d) < Math.PI ? 1 : -1);

                return 'translate(' + pos + ')';
            }

            function updateLabelText(d) {
                var per = Math.round(1000*d.data.value/totalcount)/10;
                return d.data.key+ " " + per + "%";
            }



        }

        return effectivenesssankey;
    }

};