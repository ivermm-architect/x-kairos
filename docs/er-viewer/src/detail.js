// Sidebar renderers for a table and for a phase block.
(function () {
  "use strict";
  var ERV = (window.ERV = window.ERV || {});

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c];
    });
  }
  ERV.esc = esc;

  ERV.placeholder = '<p class="placeholder">Click a table to see its columns and relations.</p>';

  ERV.renderDetail = function (detailEl, byName, relations, name) {
    var t = byName[name];
    if (!t) return;
    var p = ERV.phaseOf(name);
    var html = "<h2>" + esc(t.name) + "</h2>";
    html +=
      '<div class="sub">' +
      p.milestone +
      " · " +
      esc(p.label) +
      " · " +
      t.columns.length +
      " columns</div>";
    if (t.description) html += '<p class="desc">' + esc(t.description) + "</p>";

    html += "<h3>Columns</h3>";
    t.columns.forEach(function (c) {
      var chips = "";
      if (c.pk) chips += '<span class="chip pk">PK</span>';
      if (c.fk) chips += '<span class="chip fk">FK</span>';
      if (!c.nullable) chips += '<span class="chip nn">NOT NULL</span>';
      html +=
        '<div class="col"><span class="name">' +
        esc(c.name) +
        "</span>" +
        '<span class="ctype">: ' +
        esc(c.type) +
        "</span>" +
        chips +
        (c.description ? '<div class="cdesc">' + esc(c.description) + "</div>" : "") +
        "</div>";
    });

    var out = relations.filter(function (r) {
      return r.source_table === name;
    });
    var inc = relations.filter(function (r) {
      return r.target_table === name;
    });
    if (out.length || inc.length) {
      html += "<h3>Relations</h3>";
      out.forEach(function (r) {
        html +=
          '<div class="rel"><strong>N:1</strong> → <code>' +
          esc(r.target_table) +
          "</code> " +
          '<span class="ctype">(' +
          esc(r.source_column) +
          " → " +
          esc(r.target_column) +
          ")</span></div>";
      });
      inc.forEach(function (r) {
        html +=
          '<div class="rel"><strong>1:N</strong> ← <code>' +
          esc(r.source_table) +
          "</code> " +
          '<span class="ctype">(' +
          esc(r.source_table) +
          "." +
          esc(r.source_column) +
          " → " +
          esc(r.target_column) +
          ")</span></div>";
      });
    }
    html +=
      '<h3>Data flow</h3><a class="flow-link" href="../data-flow/index.html?table=' +
      encodeURIComponent(name) +
      '">See operations that write ' +
      esc(name) +
      " →</a>";
    detailEl.innerHTML = html;
  };

  ERV.renderBlockDetail = function (detailEl, label, tableNames) {
    var html = "<h2>" + esc(label) + "</h2>";
    html += '<div class="sub">' + tableNames.length + " tables</div>";
    html += "<h3>Tables</h3>";
    tableNames
      .slice()
      .sort()
      .forEach(function (id) {
        html += '<div class="rel"><code>' + esc(id) + "</code></div>";
      });
    detailEl.innerHTML = html;
  };
})();
