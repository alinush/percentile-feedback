function getNow() {
  var d = new Date();
  var now = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
  return now - midnight_seconds;
}

function workTime(wr) {
  var total = 0;
  for (var i = 0; i < wr.starts.length; ++i) {
    var start = wr.starts[i];
    var stop = wr.stops[i];
    if (typeof stop == 'undefined')
      stop = getNow();
    total += stop - start;
  }
  return total;
}

function workTimeToday() {
  return workTime(today_wr);
}

function workTimeTotal() {
  var total = 0;
  for (var i = 0; i < past_wrs.length; ++i) {
    total += workTime(past_wrs[i]);
  }
  return total;
}

function updateWorkTime() {
  $('#pf_timer_today_total').text(formatTime(workTimeToday()));
  $('#pf_timer_all_time_total').text(formatTime(workTimeTotal()));
}

// Or secondsToTime
function formatTime(sec) {
  var hours = Math.floor(sec / 3600);
  var minutes = Math.floor((sec % 3600) / 60);
  var seconds = sec % 60;
  if (minutes < 10) { minutes = "0" + minutes; }
  if (seconds < 10) { seconds = "0" + seconds; }
  return hours + ":" + minutes + ":" + seconds;
}

function next_boundary(start, interval) {
  // For example, let's consider a start of 7230
  // This is 3600 + 3600 + 30, i.e. 02:00:30, thirty seconds past 2am

  var sinceLastBoundary = start % interval;
  // Example: 7230 % 3600 = 30
  // That's the time elapsed since the last interval boundary
  // The last interval boundary was 7200 (3600 * 2, i.e. 2am)

  var untilNextBoundary = interval - sinceLastBoundary;
  // Example: 3600 - 30 = 3570
  // This is the time until the next interval boundary
  // In other words, we're 30 seconds after 2am
  // So now there's another 3600 seconds (1 hour) - 30 seconds to go
  // That's 3570 seconds

  var nextBoundary = start + untilNextBoundary;
  // Example: 7230 + 3570 = 10800
  // This is the time we're at now plus the time until the next boundary
  // In this case it adds up to 10800, which is 3600 * 3, i.e. 3am

  return nextBoundary;
}

function generateHistogram(wrs, interval, ends_early) {
  // TODO: randomize the start time a bit so that there's jitter
  var histogram = [];
  var day_end = ends_early ? getNow() : 86400;

  for (var i = 0; i < wrs.length; ++i) {
    histogram.push([]);
    for (var time = 0; time < day_end; time += interval)
      histogram[i].push(0);
    var wr = wrs[i];
    for (var j = 0; j < wr.starts.length; ++j) {
      var start = wr.starts[j];
      var stop = wr.stops[j];
      if (typeof stop == "undefined") {
        // Either today (still working), or some past day that overran
        stop = wrs.length == 1 ? getNow() : start + 1;
      }
      while (start < stop) {
        var nextBoundary = next_boundary(start, interval);
        var new_start;
        var new_stop;

        // Is there an interval between start and stop?
        if (nextBoundary < stop) {
          // Yes, there is an interval boundary
          new_start = nextBoundary;
          new_stop = stop;
          // This next line must come after the two above
          stop = nextBoundary;
          // We break this period up so that the current start and stop are the
          // time *up until* the next interval boundary. Then we also set the
          // new start time to correspond to the next interval boundary.
          // So imagine that we have:
          //   start    |   stop
          // Where "|" is an interval boundary
          // What we've done is to make replacements like so:
          //   start   stop/new_start    new_stop
        } else {
          // No, there is no interval boundary
          new_start = 0;
          new_stop = 0;
          // We set these values so that the loop will end
          // (This acts a bit like a break sentinel)
        }

        // Do histogram population stuff
        var period = stop - start;
        var start_bucket = Math.floor((nextBoundary - interval) / interval);
        // This should be checked for fencepost errors
        // May also not work with certain interval settings
        var end_bucket = Math.floor(day_end / interval);
        for (var bucket = start_bucket; bucket <= end_bucket; bucket++) {
          histogram[i][bucket] += period;
        }

        start = new_start;
        stop = new_stop;
      }
    }
  }
  // TODO: is this still needed? if (ends_early) { histogram[0].pop(); }
  return histogram;
}

function calculatePercentile(past_wrs, today_histogram) {
  if (!past_wrs.length) return 100;
  var today_total = today_histogram[0][today_histogram[0].length - 1];
  var better_day_count = 0;
  for (var i = 0; i < past_wrs.length; ++i) {
    var wr = past_wrs[i];
    var histogram = generateHistogram([wr], today_bucket_interval, true);
    var total = histogram[0][histogram[0].length - 1];
    if (total > today_total)
      ++better_day_count;
  }
  return 100 * (1 - (better_day_count / past_wrs.length));
}

var past_bucket_interval = 60 * 60; // should divide 86400 evenly
var today_bucket_interval = 1 * 60; // should divide past_bucket_interval evenly
var hoff = (midnight_seconds / 3600) % 1;
var chart = false;

function plotPoint(data, histogram, day, bucket, interval, jitter) {
  var x = bucket * interval / 3600;
  var y = 100 * histogram[day][bucket] / ((1 + bucket) * interval);
  if (jitter) { x += 1.0 * (Math.random() - 0.5); }
  data.push([x + hoff, y]);
}

function generateChart() {
  // Skip the update sometimes if we're not working, to save on memory leaking
  if (chart && Math.random() < 0.75)
    return;

  var past_histogram = generateHistogram(past_wrs, past_bucket_interval);
  var today_histogram = generateHistogram(
    [today_wr], today_bucket_interval, true);
  var today_percentile = calculatePercentile(past_wrs, today_histogram);

  var past_chart_data = [];
  for (var day = 0; day < past_histogram.length; ++day) {
    for (var bucket = 0; bucket < past_histogram[day].length; ++bucket) {
      plotPoint(past_chart_data, past_histogram, day, bucket,
                past_bucket_interval, true);
    }
  }

  var today_chart_data = [];
  for (var bucket = 0; bucket < today_histogram[0].length; ++bucket) {
    plotPoint(today_chart_data, today_histogram, 0, bucket,
              today_bucket_interval, false);
  }

  if (chart)
    chart.destroy();

  chart = new Highcharts.Chart({
    chart: {
      renderTo: 'percentile_feedback',
      defaultSeriesType: 'scatter',
      zoomType: 'xy',
      backgroundColor: 'transparent',
      resetZoomButton: {
        position: {
	    x: 0,
	    y: -30
	}
      }
    },
    title: {
      text: 'Work Efficiency by Hour of Day'
    },
    subtitle: {
      text: '% Hours Worked (compared to the past)'
    },
    xAxis: {
      title: {
        enabled: true,
        text: 'Hour'
      },
      tickInterval: 1,
      tickmarkPlacement: "on",
      startOnTick: false,
      endOnTick: false,
      showLastLabel: true,
      min: 0.5 + hoff,
      max: 23.5 + hoff,
      categories: ["00", "01", "02", "03", "04", "05",
                   "06", "07", "08", "09", "10", "11",
                   "12", "13", "14", "15", "16", "17",
                   "18", "19", "20", "21", "22", "23",
                   "00", "01", "02", "03", "04", "05",
                   "06", "07", "08", "09", "10", "11",
                   "12"].slice(Math.floor(midnight_seconds / 3600))
    },
    yAxis: {
      title: {
        text: 'Work Efficiency'
      },
      min: 0,
      max: 100
    },
    tooltip: {
      formatter: function() {
        return ''+
          (this.x * this.y / 100).toFixed(2) + '/' + this.x.toFixed(2) +
          ' hours worked ('+ this.y.toFixed(2) +'% efficiency)';
      }
    },
    legend: {
      layout: 'vertical',
      align: 'right',
      verticalAlign: 'top',
      x: 0,
      y: 55,
      floating: true,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1
    },
    labels: {
      items: [{
        html: "PR " + today_percentile.toFixed(0),
	style: {left: '10px', top: '32px', "font-size": '36px',
		color: 'rgb(30, 216, 15)'}
      }]
    },
    plotOptions: {
      scatter: {
        marker: {
          radius: 4,
          states: {
            hover: {
              enabled: true,
              lineColor: 'rgb(100,100,100)'
            }
          }
        },
        states: {
          hover: {
            marker: {
              enabled: false
            }
          }
        }
      }
    },
    series: [{
      name: 'Past',
      color: 'rgba(119, 174, 216, .15)',
      data: past_chart_data
    }, {
      name: 'Today',
      color: 'rgb(30, 216, 15)',
      data: today_chart_data,
      marker: {
        radius: 2
      }
    }]
  });
}

$(document).ready(function() {
  generateChart();
  updateWorkTime();
  updateInterval = setInterval(updateWorkTime, 1000);
  setTimeout(function() { location.reload(true); }, refresh_delay * 1000); // ??
  setInterval(generateChart, 10 * 60 * 1000); // ten minutes
});