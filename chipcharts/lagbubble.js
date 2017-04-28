var LagBubble = {
    createInstance: function (domId) {
        var dom = document.getElementById(domId);
        var width = dom.getBoundingClientRect().width;
        var height = dom.getBoundingClientRect().height;

        var margin = { top: 20, right: 20, bottom: 50, left: 50 },
            width = width - margin.left - margin.right,
            height = height - margin.top - margin.bottom;

        var svg = d3.select('#' + domId).append("svg")
            .attr("id", "netsvg")
            .attr("width", width + margin.right + margin.left)
            .attr("height", height + margin.top + margin.bottom)


        var x = d3.scaleLinear().range([0, width]),
            y = d3.scaleLinear().range([height, 0]);
        r = d3.scaleLinear().range([2, 40]);

        var xAxis = d3.axisBottom(x),
            yAxis = d3.axisLeft(y);

        svg.append("defs").append("clipPath")
            .attr("id", "clip")
            .append("rect")
            .attr("width", width)
            .attr("height", height);

        var focus = svg.append("g")
            .attr("class", "focus")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


        var xAxisG = focus.append("g")
            .attr("class", "axis axis--x")
            .attr("transform", "translate(0," + height + ")")
            //.call(xAxis);

        var yAxisG = focus.append("g")
            .attr("class", "axis axis--y")
            //.call(yAxis);

        focus.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - margin.left)
            .attr("x", 0 - (height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text("Mouse Distance(pixels)");

        svg.append("text")
            .attr("transform",
            "translate(" + ((width + margin.right + margin.left) / 2) + " ," +
            (height + margin.top + 30) + ")")
            .style("text-anchor", "middle")
            .text("Lag Time(ms) between Actions");


        var dotsgroup = focus.append("g");
        dotsgroup.attr("clip-path", "url(#clip)");

        // var color = d3.scaleOrdinal(d3.schemeCategory20c);
        var lagbubble = {};

        lagbubble.loadData = function (root, steps, batch, origin) {
            var me = this;
            d3.json("/kitchen", function (err, data) {
                if (!err) me.setData(data);
            }).header("Content-Type", "application/json")
                .send("POST", JSON.stringify({ 'dish': 'treelike', 'rootkey': root, 'granularity': steps, 'batch': batch, 'origins': origin }));
            return this;
        }

        lagbubble.setData = function (data) {
            var root = d3.hierarchy(data);
            this.update(root);
        };


        lagbubble.update = function (root) {

            var nodes = root.descendants();
            var links = nodes.slice(1);
            var validlinks = [];
            links.forEach(function (link) {
                link.data.dis = linkDistance(link);
            });

            var idLinks = validLinks(identicalLinks(links));

            x.domain(d3.extent(idLinks, function (d) {
                return d.lag;
            }));
            y.domain([0, d3.max(idLinks, function (d) { return d.dis })]);
            r.domain(d3.extent(idLinks, function (d) {
                return d.count;
            }));
            var color = d3.scaleLinear()
            .domain(x.domain())
            .range(["rgba(200,10,10,0.3)","rgba(255,10,10,2)"])
            .interpolate(d3.interpolateHcl);
            // append scatter plot to main chart area 

            var dots = dotsgroup.selectAll("dot")
                .data(idLinks);

            var dotsEnter = dots.enter().append("circle")
                .style('fill', function (d) {
                    return color(d.lag)
                })
                .attr('class', 'dot')
                .attr("r", function (d) {
                    return r(d.count);
                })
                .style("opacity", 0.5)
                .attr("cx", function (d) { return x(d.lag); })
                .attr("cy", function (d) { return y(d.dis); });

            var dotsExit = dots.exit().remove();

            dots = dotsEnter.merge(dots);

            svg.selectAll(".dot")
                .append("title")
                .text(function (d) {
                    var t = d.source.data.key + '\n' + d.target.data.key + '\n' + d.count + '(AVG:'+Math.round(d.lag)+'ms)';
                    return t
                });

            xAxisG.call(xAxis);
            yAxisG.call(yAxis);

        }
        

        function linkDistance(node) {
            var px = node.parent.data.pos.x;
            var py = node.parent.data.pos.y;

            var x = node.data.pos.x;
            var y = node.data.pos.y;
            var dis = Math.round(Math.pow((px - x) * (px - x) + (py - y) * (py - y), 0.5));

            return dis;
        }

        function identicalLinks(links) {
            var linkmap = {}, linkarr = [];
            links.forEach(function (link) {
                var key = link.parent.data.key + '__' + link.data.key;
                if (!linkmap[key]) {
                    linkmap[key] = { key: key, count: link.data.count, lag: link.data.lag, dis: link.data.dis, source: link.parent, target: link };
                    linkarr.push(linkmap[key]);
                } else {
                    var l = linkmap[key];
                    l.count += link.data.count;
                    l.lag += (link.data.lag - l.lag) / l.count;
                    l.dis += (link.data.dis - l.dis) / l.count;
                }
            })

            return linkarr;
        }

        function validLinks(links) {
            var vlnks = [];
            links.forEach(function (l) {
                if (l.count > 5) vlnks.push(l);
            });
            return vlnks;

        }

        return lagbubble;
    }

};