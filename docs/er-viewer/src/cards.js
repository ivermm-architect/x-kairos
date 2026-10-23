// Table cards rendered as real HTML (not canvas text). The browser sizes and
// wraps them reliably; we then measure each card to size its Cytoscape node, so
// edges attach to the exact card bounds.
(function () {
  "use strict";
  var ERV = (window.ERV = window.ERV || {});

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c];
    });
  }

  function cardHtml(t) {
    var p = ERV.phaseOf(t.name);
    var head =
      '<div class="card-head"><span class="mstone">' +
      esc(p.milestone) +
      "</span>" +
      esc(t.name) +
      "</div>";
    var rows = t.columns
      .map(function (c) {
        var mark = c.pk
          ? '<span class="mark pk">🔑</span>'
          : c.fk
            ? '<span class="mark fk">🔗</span>'
            : '<span class="mark"></span>';
        return (
          '<div class="card-row">' +
          mark +
          '<span class="cname">' +
          esc(c.name) +
          "</span>" +
          '<span class="ctype">: ' +
          esc(c.type) +
          "</span></div>"
        );
      })
      .join("");
    return head + '<div class="card-body">' + rows + "</div>";
  }

  // Builds one .card per table inside `overlay`, measures them, and returns:
  //   { els: { name: HTMLElement }, sizes: { name: {w, h} } }
  ERV.createCards = function (overlay, schema) {
    var els = {};
    var sizes = {};
    schema.tables.forEach(function (t) {
      var el = document.createElement("div");
      el.className = "card";
      el.dataset.table = t.name;
      el.style.setProperty("--c", ERV.phaseOf(t.name).color);
      el.innerHTML = cardHtml(t);
      overlay.appendChild(el);
      els[t.name] = el;
    });
    // Measure after all are in the DOM (natural, unscaled size).
    schema.tables.forEach(function (t) {
      var el = els[t.name];
      sizes[t.name] = { w: el.offsetWidth, h: el.offsetHeight };
    });
    return { els: els, sizes: sizes };
  };
})();
