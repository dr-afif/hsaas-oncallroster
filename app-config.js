window.APP_CONFIG = {
  SUPABASE_URL: "https://hklgsjozideopydbdcmp.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrbGdzam96aWRlb3B5ZGJkY21wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MTg1OTUsImV4cCI6MjA4NTE5NDU5NX0.HqsGTto4CmExajUlq5ZzrzsctRCMDw6_-0XGKXZf7z4",
  REFRESH_INTERVAL: 0
};

window.PerfTracker = {
  marks: {},
  measurements: [],
  start: function(name) { this.marks[name] = performance.now(); },
  end: function(name) {
    if (this.marks[name]) {
      this.measurements.push({ Operation: name, 'Duration (ms)': Number((performance.now() - this.marks[name]).toFixed(2)) });
      delete this.marks[name];
    }
  },
  print: function() {
    console.table(this.measurements);
    const sorted = [...this.measurements].sort((a,b) => b['Duration (ms)'] - a['Duration (ms)']);
    console.log("Top 3 Slowest Operations:", sorted.slice(0,3));
    window.__TOP_PERF = sorted.slice(0,3);
    let div = document.getElementById('perf-debug');
    if(!div) {
      div = document.createElement('div');
      div.id = 'perf-debug';
      div.style.display = 'none';
      document.body.appendChild(div);
    }
    div.innerText = JSON.stringify(sorted);
  }
};
