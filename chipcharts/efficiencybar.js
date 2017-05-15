var EfficiencyBar = {
    createInstance: function (domId) {
        var dom = document.getElementById(domId);
        var width = dom.getBoundingClientRect().width;
        var height = dom.getBoundingClientRect().height;

        var margin = { top: 40, right: 30, bottom: 50, left: 30, middle: 50 },
            width = width - margin.middle - margin.left - margin.right,
            height = height - margin.top - margin.bottom;

        var svg = d3.select('#' + domId).append("svg")
            .attr("width", width + margin.right + margin.middle + margin.left)
            .attr("height", height + margin.top + margin.bottom)

        width /= 2;
        var lagg = svg.append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
            .attr("width", width)
            .attr("height", height);

        var stepg = svg.append("g")
            .attr("transform", "translate(" + (width + margin.middle + margin.left) + "," + margin.top + ")")
            .attr("width", width)
            .attr("height", height);

        var x1 = d3.scaleBand()
            .rangeRound([0, width])
            .paddingInner(0.1)
            .align(0.1);
        var x2 = d3.scaleBand()
            .rangeRound([0, width])
            .paddingInner(0.1)
            .align(0.1);

        var y1 = d3.scaleLinear()
            .rangeRound([height, 0]);

        var y2 = d3.scaleLinear()
            .rangeRound([height, 0]);

        var z = d3.scaleOrdinal(d3.schemeCategory20);

        var xAxis1 = lagg.append("g")
            .attr("class", "axis")
            .attr("transform", "translate(0," + height + ")");

        xAxis1.append("text")
            .attr("y", -30)
            .attr("x", width - 30)
            .attr("fill", "#000")
            .attr("font-weight", "bold")
            .text("Time Cost");

        var xAxis2 = stepg.append("g")
            .attr("class", "axis")
            .attr("transform", "translate(0, " + height + ")");

        xAxis2.append("text")
            .attr("y", -30)
            .attr("x", width - 40)
            .attr("fill", "#000")
            .attr("font-weight", "bold")
            .text("Steps");

        var yAxis1 = lagg.append("g")
            .attr("class", "axis");

        yAxis1.append("text")
            .attr("x", 2)
            .attr("y", y1(y1.ticks().pop()) + 0.5)
            .attr("dy", "0.32em")
            .attr("fill", "#000")
            .attr("font-weight", "bold")
            .attr("text-anchor", "start")
            .text("Case Count");

        var yAxis2 = stepg.append("g")
            .attr("class", "axis")

        yAxis2.append("text")
            .attr("x", 2)
            .attr("y", y2(y2.ticks().pop()) + 0.5)
            .attr("dy", "0.32em")
            .attr("fill", "#000")
            .attr("font-weight", "bold")
            .attr("text-anchor", "start")
            .text("Case Count");
        // d3.scaleOrdinal()
        // .range(["#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56", "#d0743c", "#ff8c00"]);   


        function formatLagData(data) {
            var bylag = {};
            var bylagarr = [];
            var targetkeys = data.target;
            data.children[1].children.forEach(function (item) {
                var lkey = item.key;
                if (!bylag[lkey]) {
                    bylagarr.push(bylag[lkey] = { total: 0, key: Number(lkey) });
                    targetkeys.forEach(function (k) {
                        bylag[lkey][k] = 0;
                    })
                }
                var totalobj = bylag[lkey];

                item.children.forEach(function (cld) {
                    if (!totalobj[cld.key]) totalobj[cld.key] = 0;
                    totalobj[cld.key] += cld.count;
                    totalobj.total += cld.count;
                });

                // item.lagkey = Number(item.key);
                // bylag.push(item);
            });
            // debugger;
            bylagarr.sort(function (l1, l2) {
                return Number(l1.key) - Number(l2.key);
            });

            return bylagarr;
        }

        function formatStepData(data) {
            var bystep = {};
            var bysteparr = [];
            var targetkeys = data.target;
            data.children[2].children.forEach(function (item) {
                var skey = item.key;
                if (!bystep[skey]) {
                    bysteparr.push(bystep[skey] = { total: 0, key: Number(skey) });
                    targetkeys.forEach(function (k) {
                        bystep[skey][k] = 0;
                    })
                }
                var totalobj = bystep[skey];

                item.children.forEach(function (cld) {
                    if (!totalobj[cld.key]) totalobj[cld.key] = 0;
                    totalobj[cld.key] += cld.count;
                    totalobj.total += cld.count;
                });

                // item.lagkey = Number(item.key);
                // bylag.push(item);
            });
            // debugger;
            bysteparr.sort(function (l1, l2) {
                return Number(l1.key) - Number(l2.key);
            });

            return bysteparr;
        }

        function getAvgX(data, axis, valueAtt, countAtt) {
            var v = 0, c = 0;
            data.forEach(function (d) {
                v += d[valueAtt] * d[countAtt];
                c += d[countAtt];
            });

            var avg = v / c;
            var varr = axis.domain();
            var bw = axis.bandwidth();
            for (var i = 0; i < varr.length; i++) {
                if (varr[i] > avg) {
                    var offset = Math.round((varr[i] - avg) * bw / (varr[i] - varr[i - 1]));
                    return axis(varr[i]) - offset;
                }
            }

            return null;
        }

        var efficiencybar = {
        };

        efficiencybar.loadData = function (source, target, steps, batch, origin, category) {
            var me = this;
            d3.json("/kitchen", function (err, data) {
                if (!err) me.setData(data);
            }).header("Content-Type", "application/json")
                .send("POST", JSON.stringify({ 'dish': 'pairs', 'source': source, 'target': target, 'granularity': steps, 'batch': batch, 'origins': origin, 'category': category}));

            return this;
        }

        efficiencybar.setData = function (data) {
            var lagData = formatLagData(data);
            var stepData = formatStepData(data);
            this.update(data.target, lagData, stepData);
        };


        efficiencybar.update = function (keys, lagData, stepData) {
            var xlabels = {};
            for (var i = 0; i < lagData.length; i++) {
                if (i % 10 === 0) xlabels[lagData[i].key] = true;
            }



            x1.domain(lagData.map(function (d) { return d.key; }));
            y1.domain([0, d3.max(lagData, function (d) {
                return d.total;
            })]).nice();
            z.domain(keys);

            x2.domain(stepData.map(function (d) { return d.key; }));
            y2.domain([0, d3.max(stepData, function (d) {
                return d.total;
            })]).nice();

            var avgLagX = getAvgX(lagData, x1, 'key', 'total');
            var avgStepsX = getAvgX(stepData, x2, 'key', 'total');


            lagg.append("g")
                .selectAll("g")
                .data(d3.stack().keys(keys)(lagData))
                .enter().append("g")
                .style("opacity", 1)
                .attr("fill", function (d) {
                    return z(d.key);
                })
                .selectAll("rect")
                .data(function (d) {
                    return d;
                })
                .enter().append("rect")
                .attr("x", function (d) {
                    return x1(d.data.key);
                })
                .attr("y", function (d) {
                    return y1(d[1]);
                })
                .attr("height", function (d) {
                    return y1(d[0]) - y1(d[1]);
                })
                .attr("width", x1.bandwidth())
                .attr("class", "bar");

            lagg.selectAll(".bar")
                .append("title")
                .text(function (d) {
                    if (!d.data) return;

                    var t = Math.round(d.data.key / 1000) + 's\n' + d.data.total;
                    return t
                });

            stepg.append("g")
                .selectAll("g")
                .data(d3.stack().keys(keys)(stepData))
                .enter().append("g")
                .style("opacity", 1)
                .attr("fill", function (d) {
                    return z(d.key);
                })
                .selectAll("rect")
                .data(function (d) {
                    return d;
                })
                .enter().append("rect")
                .attr("x", function (d) {
                    return x2(d.data.key);
                })
                .attr("y", function (d) {
                    return y2(d[1]);
                })
                .attr("height", function (d) {
                    return y2(d[0]) - y2(d[1]);
                })
                .attr("width", x2.bandwidth())
                .attr("class", "bar");

            stepg.selectAll(".bar")
                .append("title")
                .text(function (d) {
                    if (!d.data) return;
                    var t = d.data.key + 'steps\n' + d.data.total;
                    return t
                });

            xAxis1.call(d3.axisBottom(x1).tickFormat(function (d) {
                return xlabels[d] ? ' ' + d / 1000 + 's' : '';
            }));
            yAxis1.call(d3.axisLeft(y1).ticks(null, "s"));

            xAxis2.call(d3.axisBottom(x2));
            yAxis2.call(d3.axisLeft(y2).ticks(null, "s"));

            var line1 = lagg.append("line")
                .style("stroke", "#ff7f0e")
                .style("stroke-width", 2)
                .style("opacity", 1);

            var avg1 = lagg.append("text")
                .attr("y", -2)
                .attr("font-size", 10)
                .attr("fill", "#ff7f0e")
                .attr("font-weight", "bold")
                .attr("text-anchor", "middle");

            var line2 = stepg.append("line")
                .style("stroke", "#ff7f0e")
                .style("stroke-width", 2)
                .style("opacity", 1);
            var avg2 = stepg.append("text")
                .attr("y", -2)
                .attr("font-size", 10)
                .attr("fill", "#ff7f0e")
                .attr("font-weight", "bold")
                .attr("text-anchor", "middle");

            line1.attr("x1", avgLagX)
                .attr("y1", 0)
                .attr("x2", avgLagX)
                .attr("y2", height);
            avg1.attr("x", avgLagX)
                .text("Avg");

            line2.attr("x1", avgStepsX)
                .attr("y1", 0)
                .attr("x2", avgStepsX)
                .attr("y2", height);

            avg2.attr("x", avgStepsX)
                .text("Avg");


            var legend1 = lagg.append("g")
                .attr("font-family", "sans-serif")
                .attr("font-size", 10)
                .attr("text-anchor", "end")
                .selectAll("g")
                .data(keys.slice().reverse())
                .enter().append("g")
                .attr("transform", function (d, i) { return "translate(0," + i * 20 + ")"; });

            legend1.append("rect")
                .attr("x", width - 19)
                .attr("width", 19)
                .attr("height", 19)
                .attr("fill", z);

            legend1.append("text")
                .attr("x", width - 24)
                .attr("y", 9.5)
                .attr("dy", "0.32em")
                .text(function (d) { return d; });

            var legend2 = stepg.append("g")
                .attr("font-family", "sans-serif")
                .attr("font-size", 10)
                .attr("text-anchor", "end")
                .selectAll("g")
                .data(keys.slice().reverse())
                .enter().append("g")
                .attr("transform", function (d, i) { return "translate(0," + i * 20 + ")"; });

            legend2.append("rect")
                .attr("x", width - 19)
                .attr("width", 19)
                .attr("height", 19)
                .attr("fill", z);

            legend2.append("text")
                .attr("x", width - 24)
                .attr("y", 9.5)
                .attr("dy", "0.32em")
                .text(function (d) { return d; });
        }

        return efficiencybar;
    }

};