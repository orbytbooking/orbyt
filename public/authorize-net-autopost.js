/* Auto-submit Accept Hosted token form; loaded from /api/authorize-net/redirect bridge page (no inline script). */
(function () {
  var form = document.getElementById("authnet");
  if (form && typeof form.submit === "function") {
    form.submit();
  }
})();
