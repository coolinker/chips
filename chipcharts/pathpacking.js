var PathPacking = {
    createInstance: function (domId) {
        var dom = document.getElementById(domId);
        var width = dom.getBoundingClientRect().width;
        var height = dom.getBoundingClientRect().height;
        width = height = Math.min(width, height);

        var margin = { top: 0, right: 0, bottom: 0, left: 0 },
            width = width - margin.left - margin.right,
            height = height - margin.top - margin.bottom;

        // append the svg object to the body of the page
        // appends a 'group' element to 'svg'
        // moves the 'group' element to the top left margin
        var svg = d3.select('#' + domId).append("svg")
            .attr("width", width + margin.right + margin.left)
            .attr("height", height + margin.top + margin.bottom);

        var diameter = +svg.attr("width");
        var g = svg.append("g").attr("transform", "translate(" + diameter / 2 + "," + diameter / 2 + ")");

        var color = d3.scaleLinear()
            .domain([-1, 20])
            .range(["hsl(0,100%,100%)", "hsl(0,20%,20%)"])
            .interpolate(d3.interpolateHcl);

        var morecolor = d3.scaleLinear()
            .domain([-1, 20])
            .range(["rgb(80%,90%,80%)", "rgb(0%,30%,0%)"])
            .interpolate(d3.interpolateHcl);
        var lesscolor = d3.scaleLinear()
            .domain([-1, 20])
            .range(["rgb(100%,80%,80%)", "rgb(50%,0%,0%)"])
            .interpolate(d3.interpolateHcl);


        var pack = d3.pack()
            .size([diameter - margin.top, diameter - margin.top])
            .padding(2);

        var root;
        var nodeid = 0;
        var duration = 500;
        var pathpacking = {};
        var difforigin = null;
        var zoomHandler = null;
        var circleUpdate = null;
        var textUpdate = null;
        
        pathpacking.loadData = function (root, steps, batch, origin, diff) {
            difforigin = diff;
            var me = this;
            d3.json("/kitchen", function (err, data) {
                if (!err) me.setData(data);
            }).header("Content-Type", "application/json")
                .send("POST", JSON.stringify({ 'dish': 'treelike', 'rootkey': root, 'granularity': steps, 'batch': batch, 'origins': origin }));
            return this;
        }

        pathpacking.setZoomHandler = function (h) {
            zoomHandler = h;
        }

        pathpacking.zoomToNode = function (arr){

        }

        pathpacking.setData = function (data) {
            this.rootNode = root = d3.hierarchy(data)
                .sum(function (d) { return d.count; })
                .sort(function (a, b) { return b.value - a.value; });

            this.update(root);
        };


        pathpacking.update = function () {
            var focus = root,
                nodes = pack(root).descendants(),
                view;

            var circle = g.selectAll("circle")
                .data(nodes)

            var circleEnter = circle.enter().append("circle")
                .attr("class", function (d) { return d.parent ? d.children ? "node" : "node node--leaf" : "node node--root"; })
                .style("fill", function (d) {
                    if (!difforigin) return color(d.depth);

                    if (!d.data.origincounts[difforigin]) {
                        return lesscolor(d.depth);
                    } else {
                        var more = true;
                        for (var att in d.data.origincounts) {
                            if (att !== difforigin) more = false;
                        }
                        if (more) return morecolor(d.depth)
                    }


                    return color(d.depth);
                })
                .on("click", function (d) { if (focus !== d) zoom(d), d3.event.stopPropagation(); });


            svg.selectAll(".node")
                .append("title")
                .text(function (d) {
                    var t = d.data.key + ' - ' + d.data.count;
                    var pn = d;
                    while (pn = pn.parent) {
                        t = pn.data.key + ' - ' + pn.data.count + '\n' + t;
                    }
                    return t
                });


            var text = g.selectAll("text")
                .data(nodes);

            var textEnter = text.enter().append("text")
                .attr("class", "label")
                .style("font", '12px "Helvetica Neue", Helvetica, Arial, sans-serif')
                // .style("font-weight", 'bold')
                .style("text-anchor", 'middle')
                .style("fill", '#222')
                .style("display", function (d) { return d.parent === root ? "inline" : "none"; })
                .text(function (d) { return d.data.key; });


            circleUpdate = circleEnter.merge(circle);
            textUpdate = textEnter.merge(text);

            var node = g.selectAll("circle,text");

            svg
                // .style("background", color(-1))
                .on("click", function () { zoom(root); });

            zoomTo([root.x, root.y, root.r * 2 + margin.top]);

            var circleExit = circle.exit().transition()
                .duration(duration)
                .attr("transform", function (d) { return "translate(" + 0 + "," + 0 + ")"; })
                .remove();

            circleExit.attr("r", 1e-6);

            var textExit = text.exit().transition()
                .duration(duration)
                .attr("transform", function (d) { return "translate(" + 0 + "," + 0 + ")"; })
                .remove();
            textExit.select("text")
                .style("fill-opacity", 1e-6);

        };
        
        pathpacking.zoomToNode = function(arr){
            var c, cn = [this.rootNode];
            while(c = arr.shift()){
                for (var i=0; i<cn.length; i++) {
                    if (cn[i].data.key === c) {
                        if (arr.length === 0) {
                            zoom(cn[i]);
                            return;
                        }

                        cn = cn[i].children;
                        break;
                    }
                }
            }
        }

        function zoom(d) {
            var focus0 = focus; focus = d;

            var transition = d3.transition()
                .duration(d3.event.altKey ? 7500 : 750)
                .tween("zoom", function (d) {
                    var i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 2 + margin.top]);
                    return function (t) { zoomTo(i(t)); if (zoomHandler) zoomHandler(d, t); };
                });

            transition.selectAll("text")
                .filter(function (d) { return d.parent === focus || this.style.display === "inline"; })
                .style("fill-opacity", function (d) { return d.parent === focus ? 1 : 0; })
                .on("start", function (d) { if (d.parent === focus) this.style.display = "inline"; })
                .on("end", function (d) { if (d.parent !== focus) this.style.display = "none"; });

        }

        function zoomTo(v) {
            var k = diameter / v[2]; view = v;
            circleUpdate.attr("transform", function (d) {
                return "translate(" + (d.x - v[0]) * k + "," + (d.y - v[1]) * k + ")";
            });
            textUpdate.attr("transform", function (d) {
                return "translate(" + (d.x - v[0]) * k + "," + (d.y - v[1]) * k + ")";
            });
            circleUpdate.attr("r", function (d) { return d.r * k; });
        }

        return pathpacking;
    }

};