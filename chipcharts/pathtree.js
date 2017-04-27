var PathTree = {
    createInstance: function (domId) {
        var dom = document.getElementById(domId);
        var width = dom.getBoundingClientRect().width;
        var height = dom.getBoundingClientRect().height;

        var margin = { top: 20, right: 90, bottom: 30, left: 90 },
            width = width - margin.left - margin.right,
            height = height - margin.top - margin.bottom;

        // append the svg object to the body of the page
        // appends a 'group' element to 'svg'
        // moves the 'group' element to the top left margin
        var svg = d3.select('#'+domId).append("svg")
            .attr("width", width + margin.right + margin.left)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate("
            + margin.left + "," + margin.top + ")");
        var treemap = d3.tree().size([height, width]);
        //var diagonal = d3.svg.diagonal().projection(function (d) { return [d.y, d.x]; });

        var root;
        var nodeid = 0;
        var maxcount = 1;
        var duration = 500;
        var treepaths = {};
        var difforigin = null;
        var updateHandler = null;

        treepaths.setUpdateHandler = function (h) {
            updateHandler = h;
        }

        treepaths.loadData = function (root, steps, batch, origin, diff) {
            difforigin = diff;
            var me = this;
            d3.json("/kitchen", function (err, data) {
                if (!err) me.setData(data);
            }).header("Content-Type", "application/json")
                .send("POST", JSON.stringify({ 'dish': 'treelike', 'rootkey': root, 'granularity': steps, 'batch': batch, 'origins': origin }));
            return this;
        }

        treepaths.setData = function (data) {
            function sortTree(node) {
                node.children.sort(function (n0, n1) {
                    if (n0.children) sortTree(n0);
                    if (n1.children) sortTree(n1);
                    return n1.count - n0.count;
                })
            }
            sortTree(data);
            root = d3.hierarchy(data, function (d) { return d.children; });
            root.x0 = height / 2;
            root.y0 = 0;

            function markDiffOrigin(node) {

                var diffsArr = [false, false];
                if (!node.data.origincounts[difforigin]) {
                    diffsArr[0] = true;
                } else {
                    var more = true;
                    for (var att in node.data.origincounts) {
                        if (att !== difforigin) more = false;
                    }
                    diffsArr[1] = more;
                }
                node.nodediffs = diffsArr.concat();
                if (node.children) {
                    node.children.forEach(function (item) {
                        if (!diffsArr[0] && !item.data.origincounts[difforigin]) {
                            diffsArr[0] = true;
                        } else if (!diffsArr[1]) {
                            var more = true;

                            for (var att in item.data.origincounts) {
                                if (att !== difforigin) {
                                    more = false;
                                }
                            }

                            diffsArr[1] = more;
                        }

                        markDiffOrigin(item);
                        if (item.diffs[0] && !diffsArr[0]) diffsArr[0] = true;
                        if (item.diffs[1] && !diffsArr[1]) diffsArr[1] = true;

                    });
                }

                node.diffs = diffsArr;
            }

            markDiffOrigin(root);

            maxcount = root.data.count;
            function collapse(d) {
                if (d.children && d.data.count / d.parent.data.count > 0.5) {
                    d.children.forEach(collapse);
                } else if (d.children) {
                    d._children = d.children;
                    d._children.forEach(collapse)
                    d.children = null;
                }
            }

            root.children.forEach(collapse);
            this.update(root);
        };

        treepaths.update = function (source) {
            var treeData = treemap(root);

            // Compute the new tree layout.
            var nodes = treeData.descendants(),
                links = treeData.descendants().slice(1);

            // Normalize for fixed-depth.
            nodes.forEach(function (d) { d.y = d.depth * 250; });
            // Update the nodes…
            var node = svg.selectAll("g.node")
                .data(nodes, function (d) {
                    return d.id || (d.id = ++nodeid);
                });

            // Enter any new nodes at the parent's previous position.
            var nodeEnter = node.enter().append("g")
                .attr("class", "node")
                .attr("transform", function (d) {
                    return "translate(" + source.y0 + "," + source.x0 + ")";
                })


            nodeEnter.append("circle")
                .attr('class', 'node')
                .attr("r", function (d) {
                    var r = Math.sqrt(d.data.count / (maxcount));
                    return Math.max(2.5, Math.round(r * 30))
                })

            svg.selectAll("circle.node")
                .append("title")
                .text(function (d) {
                    var t = d.data.key + ' (' + d.data.count+')';
                    // var pn = d;
                    // while (pn = pn.parent) {
                    //     t = pn.data.key + ' - ' + pn.data.count + '\n' + t;
                    // }
                    return t
                });

            nodeEnter.append("text")
                .attr("dy", function (d) {
                    return 13 + Math.max(Math.round(10 * d.data.count / maxcount), 1);
                })
                .style("font", '12px "Helvetica Neue", Helvetica, Arial, sans-serif')
                //.style("text-anchor", 'middle')
                .style("fill", "#888")
                .attr("x", function (d) {
                    return d.children || d._children ? -13 : 13;
                })
                .attr("text-anchor", function (d) {
                    return d.children || d._children ? "end" : "start";
                })
                .text(function (d) { return d.data.key; });


            // Transition nodes to their new position.
            var nodeUpdate = nodeEnter.merge(node);
            nodeUpdate.transition()
                .duration(duration)
                .attr("transform", function (d) { return "translate(" + d.y + "," + d.x + ")"; });

            nodeUpdate.select('circle.node')
                .attr("r", function (d) {
                    var r = Math.sqrt(d.data.count / (maxcount));
                    return Math.max(2.5, Math.round(r * 30))
                }).style("fill", function (d) {
                    return '#666';// color(d.data.key);
                })
                .style("stroke-width", function (d) {
                    return d._children ? 2 : 0;
                })
                .style("stroke", function (d) {
                    if (!d.children && !d._children) return '#555';
                    if (d.nodediffs[0] || d.nodediffs[1]) return null;
                    return (d.diffs[0] && d.diffs[1]) ? '#bb0' : (d.diffs[0] ? '#a00' : (d.diffs[1] ? '#0a0' : null));
                })
                .attr('cursor', 'pointer')
                .on("click", click);


            // Transition exiting nodes to the parent's new position.
            var nodeExit = node.exit().transition()
                .duration(duration)
                .attr("transform", function (d) { return "translate(" + source.y + "," + source.x + ")"; })
                .remove();

            nodeExit.select("circle")
                .attr("r", 1e-6);

            nodeExit.select("text")
                .style("fill-opacity", 1e-6);

            // Update the links…
            var link = svg.selectAll('path.link')
                .data(links, function (d) { return d.parent.data.key + "__" + d.data.key; });

            // Enter any new links at the parent's previous position.
            var linkEnter = link.enter().insert('path', "g")
                .attr("class", "link")
                .attr('d', function (d) {
                    var o = { x: source.x0, y: source.y0 }
                    return diagonal(o, o)
                }).style("stroke-width", function (d) {
                    return Math.max(0.5, Math.round(30 * d.data.count / maxcount));
                }).style("stroke", function (d) {
                    if (!difforigin) return "#ccc";
                    return d.nodediffs[0] ? '#e55' : (d.nodediffs[1] ? '#0a0' : '#aaa');

                })
            var linkUpdate = linkEnter.merge(link);
            // Transition links to their new position.
            linkUpdate.transition()
                .duration(duration)
                .attr("d", function (d) { return diagonal(d, d.parent) });

            // Transition exiting nodes to the parent's new position.
            var linkExit = link.exit().transition()
                .duration(duration)
                .attr("d", function (d) {
                    var o = { x: source.x, y: source.y };
                    return diagonal(o, o);
                })
                .remove();

            // Stash the old positions for transition.
            nodes.forEach(function (d) {
                d.x0 = d.x;
                d.y0 = d.y;
            });

            function diagonal(s, d) {
                path = `M ${s.y} ${s.x}
            C ${(s.y + d.y) / 2} ${s.x},
              ${(s.y + d.y) / 2} ${d.x},
              ${d.y} ${d.x}`

                return path;
            }

            var me = this;

            function click(d) {
                if (d3.event.ctrlKey) {
                    focusBranch(d);
                    me.update(d);
                } else {
                    if (d._children) {
                        d.children = d._children;
                        d._children = null;

                        d.children.forEach(function (n) {
                            if (n._children) n.children = null;
                            else {
                                n._children = n.children;
                                n.children = null;
                            }
                        })

                        me.update(d);
                    } else if (d.children) {
                        d._children = d.children;
                        d.children = null;
                        me.update(d);
                    }
                }

                if (updateHandler) updateHandler(d);
            }
            
            function focusBranch(node) {
                var child = node;
                var prt;
                while (prt = child.parent) {
                    prt._children = prt._children || prt.children;
                    prt.children = [child];
                    child = prt;
                }

                if (node._children) {
                    node.children = node._children;
                    node._children = null;

                }
            }

        };


        return treepaths;
    }

};