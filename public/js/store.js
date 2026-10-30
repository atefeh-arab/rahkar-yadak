/* یدک‌یار — جاوااسکریپت کوچک سمت کلاینت (بدون وابستگی) */
(function () {
  'use strict';

  /* ---------- جست‌وجوی زنده ---------- */
  var box = document.getElementById('search-box');
  var out = document.getElementById('suggest');
  if (box && out) {
    var timer = null;
    box.addEventListener('input', function () {
      clearTimeout(timer);
      var q = box.value.trim();
      if (q.length < 2) { out.classList.remove('open'); out.innerHTML = ''; return; }
      timer = setTimeout(function () {
        fetch('/api/search?q=' + encodeURIComponent(q))
          .then(function (r) { return r.json(); })
          .then(function (data) {
            if (!data.items || !data.items.length) { out.classList.remove('open'); return; }
            out.innerHTML = data.items.map(function (p) {
              return '<a href="/product/' + p.slug + '">' +
                '<img src="' + p.image + '" alt="">' +
                '<span><span class="s-name">' + p.name + '</span><br>' +
                '<span class="s-price">' + p.price_label + ' تومان</span></span></a>';
            }).join('');
            out.classList.add('open');
          })
          .catch(function () { out.classList.remove('open'); });
      }, 220);
    });
    document.addEventListener('click', function (e) {
      if (!out.contains(e.target) && e.target !== box) out.classList.remove('open');
    });
  }

  /* ---------- افزایش/کاهش تعداد ---------- */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-qty]');
    if (!b) return;
    var wrap = b.closest('.qty');
    var input = wrap && wrap.querySelector('input');
    if (!input) return;
    var v = parseInt(input.value, 10) || 1;
    input.value = Math.max(parseInt(input.min || 1, 10), Math.min(parseInt(input.max || 99, 10), b.dataset.qty === 'up' ? v + 1 : v - 1));
    if (input.form && input.dataset.autosubmit === '1') input.form.submit();
  });

  /* ---------- گالری کالا ---------- */
  var main = document.getElementById('main-image');
  if (main) {
    document.querySelectorAll('[data-gallery]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('[data-gallery]').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        main.src = btn.dataset.gallery;
      });
    });
  }

  /* ---------- نمایش/پنهان‌کردن فیلترها در موبایل ---------- */
  var ft = document.getElementById('filter-toggle');
  if (ft) ft.addEventListener('click', function () {
    var el = document.getElementById('filters');
    if (el) el.classList.toggle('open');
  });

  /* ---------- بستن پیام‌های خودکار ---------- */
  setTimeout(function () {
    document.querySelectorAll('[data-autohide]').forEach(function (el) { el.style.display = 'none'; });
  }, 6000);
})();
