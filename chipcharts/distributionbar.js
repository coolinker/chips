var DistributionBar = {
    createInstance: function (domId) {
        var dom = document.getElementById(domId);
        var width = dom.getBoundingClientRect().width;
        var height = dom.getBoundingClientRect().height;

        var margin = { top: 30, right: 20, middle: 30, bottom: 30, left: 50 },
            width = width - margin.left - margin.right,
            height = (height - margin.top - margin.middle - margin.bottom);

        var svg = d3.select('#' + domId).append("svg")
            .attr("width", width + margin.right + margin.left)
            .attr("height", height + margin.top + margin.middle + margin.bottom)
        height /= 2;
        var x1 = d3.scaleBand().rangeRound([0, width]),
            y1 = d3.scaleLinear().rangeRound([height, 0]),
            r = d3.scaleLinear().range([2, 30]),
            x2 = d3.scaleBand().rangeRound([0, width]),
            y2 = d3.scaleLinear().rangeRound([height, 0]);

        var data2xmap = {};
        var color = d3.scaleLinear()
            .domain(y1.domain())
            .range(["rgba(200,10,10,0.1)", "rgba(255,0,0,1)"])
            .interpolate(d3.interpolateHcl);

        var gHour = svg.append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
        var gHourNodes = gHour.append("g")
            .attr("class", "nodes");

        var xAxis1 = gHour.append("g")
            .attr("class", "axis axis--x");

        var yAxis1 = gHour.append("g")
            .attr("class", "axis axis--y");

        var gLag = svg.append("g")
            .attr("transform", "translate(" + margin.left + "," + (margin.top + margin.middle + height) + ")");
        var gLagNodes = gLag.append("g")
            .attr("class", "nodes");

        var yAxis2 = gLag.append("g")
            .attr("class", "axis axis--y");

        var xAxis2 = gLag.append("g")
            .attr("class", "axis axis--x");

        xAxis2.selectAll("text")
            .attr("dy", ".2em")
            .attr("transform", "rotate(45)");

        xAxis2.selectAll("line")
            .style("stroke-width", 0.5);

        // text label for the y axis
        gHour.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - margin.left)
            .attr("x", 0 - (height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .style("font", '12px "Helvetica Neue", Helvetica, Arial, sans-serif')
            .text("AVG Lag Time(ms)");

        gHour.append("text")
            .attr("class", "hourTitle")
            .attr("transform",
            "translate(" + (2 * width / 3) + " ," +
            (-5) + ")")
            .style("font", '10px "Helvetica Neue", Helvetica, Arial, sans-serif')
            // .attr("dy", "0em")
            .style("text-anchor", "middle");
        //.text('@' + rawdata.source.join(',') + " - @" + rawdata.target.join(','));

        gLag.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - margin.left)
            .attr("x", 0 - (height / 2))
            .attr("dy", "1em")
            .style("font", '12px "Helvetica Neue", Helvetica, Arial, sans-serif')
            .style("text-anchor", "middle")
            .text("Count");


        function formatLagData(data) {
            var bylag = [];
            data.children[1].children.forEach(function (item) {
                item.lagkey = Number(item.key);
                bylag.push(item);
            });

            bylag.sort(function (l1, l2) {
                return Number(l1.lagkey) - Number(l2.lagkey);
            });

            return bylag;
        }

        function formatHourData(data) {
            var byhour = {};
            data.children[0].children.forEach(function (item) {
                byhour[item.key] = item;
            });

            var hours = [];
            for (var i = 0; i < 24; i++) {
                var h = byhour[i];
                hours.push({
                    hour: i,
                    lag: h ? h.children[0].lag : 0,
                    count: h ? h.children[0].count : 0,
                    data: h || null

                })
            }

            return hours;
        }

        var distributionbar = {};

        distributionbar.loadData = function (source, target, steps, batch, origin) {
            gHour.select('.hourTitle').text("@" + source + " → @" + target);

            var me = this;
            d3.json("/kitchen", function (err, data) {
                if (!err) me.setData(data);
            }).header("Content-Type", "application/json")
                .send("POST", JSON.stringify({ 'dish': 'pairs', 'source': source, 'target': target, 'granularity': steps, 'batch': batch, 'origins': origin }));
            return this;
        }

        distributionbar.setData = function (data) {
            gHour.selectAll('.hourTitle')
                .text('@' + data.source.join(',') + " → @" + data.target.join(','));


            var data1 = formatHourData(data);
            var data2 = formatLagData(data);

            this.update(data1, data2);
        };


        distributionbar.update = function (data1, data2) {
            x1.domain(data1.map(function (d) { return d.hour; }));
            y1.domain([0, d3.max(data1, function (d) { return d.lag; })]);
            var x2map = data2.map(function (d) { return +d.lagkey; });

            var x2tickslen = x2map.length;
            for (var i = 0; i < x2tickslen; i++) {
                if (i % 10 === 0) data2xmap[x2map[i]] = true;
            }

            x2.domain(x2map);
            y2.domain([0, d3.max(data2, function (d) { return d.count; })]);

            color.domain(y1.domain());

            r.range([2, x1.bandwidth()])
            r.domain(d3.extent(data1, function (d) {
                return d.count;
            }));

            xAxis1.attr("transform", "translate(0," + height + ")")
                .call(d3.axisBottom(x1).tickSize(-height).tickFormat(function (d) {
                    return d + ":00"
                }))
            xAxis1.selectAll("text")
                .attr("dy", ".2em")
                .attr("transform", "rotate(45)");
            xAxis1.selectAll("line")
                .style("stroke-width", 0.5)
                .style("stroke", "#ccc");

            yAxis1.call(d3.axisLeft(y1).ticks(10, "s"))
                .append("text");

            var nodes = gHourNodes.selectAll("g")
                .data(data1, function (d) {
                    return d.hour;
                });

            var nodesEnter = nodes.enter().append("g")
                .attr("id", function (d) { return d.hour });

            var nodesExit = nodes.exit().remove();

            nodesEnter.append("circle")
                .classed('node', true);

            nodes = nodesEnter.merge(nodes);

            circle = nodes.select('circle')
                .attr("class", "circleNode")
                .style('fill', function (d) {
                    return color(d.lag)
                })
                // .attr('class', 'circle')
                .attr("r", function (d) {
                    return r(d.count);
                })
                .style("opacity", 0.8)
                .attr("cx", function (d) { return x1(d.hour); })
                .attr("cy", function (d) {
                    return y1(d.lag);
                });


            gHourNodes.selectAll(".circleNode")
                .text(function (d) {
                    var t = Math.round(d.lag) + 'ms\n' + d.hour + ':00\n' + d.count;
                    return t
                });

            // nodesExit.select("circle")
            //     .attr("r", 1e-6);

            //*********Lag bars**************/


            yAxis2.call(d3.axisLeft(y2))
                .append("text");


            var columns = gLagNodes.selectAll("g")
                .data(data2, function (d) {
                    return d.key;
                });

            var columnsEnter = columns.enter().append("g")
                .attr("id", function (d) { return d.hour });

            var columnsExit = columns.exit().remove();

            columnsEnter.append("rect")
                .classed('node', true);

            columns = columnsEnter.merge(columns);

            columns.select('rect')
                .attr("class", "bar")
                .style('fill', function (d) {
                    return color(d.key)
                })
                .attr("x", function (d) {
                    return x2(d.key);
                })
                .attr("y", function (d) { return y2(d.count); })
                .attr("width", x2.bandwidth())
                .attr("height", function (d) { return height - y2(d.count); });

            gLagNodes.selectAll(".bar")
                .append("title")
                .text(function (d) {
                    var t = Math.round(d.key) + 'ms\n' + d.count;
                    return t
                });

            xAxis2.attr("transform", "translate(-" + 0 + "," + (height) + ")")
                .call(d3.axisBottom(x2).tickFormat(function (d) {
                    return data2xmap[d] ? ' ' + d / 1000 + 's' : '';
                }));

            xAxis2.selectAll("text")
                .attr("dy", ".2em")
                .attr("transform", "rotate(45)");

            xAxis2.selectAll("line")
                .style("stroke", function (d) {
                    return data2xmap[d] ? '#222' : '#ccc';
                });

        }



        return distributionbar;
    }

};