/* پنل مدیریت — جاوااسکریپت کوچک */
(function () {
  'use strict';

  /* تأیید حذف */
  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (form.dataset.confirm && !window.confirm(form.dataset.confirm)) e.preventDefault();
  });

  /* تغییر وضعیت سفارش = ارسال خودکار */
  document.querySelectorAll('[data-autosubmit]').forEach(function (el) {
    el.addEventListener('change', function () { el.form && el.form.submit(); });
  });

  /* افزودن ردیف مشخصات فنی */
  var addSpec = document.getElementById('add-spec');
  if (addSpec) {
    addSpec.addEventListener('click', function () {
      var wrap = document.getElementById('spec-rows');
      if (!wrap) return;
      var row = document.createElement('div');
      row.className = 'form-grid';
      row.style.marginBottom = '8px';
      row.innerHTML = '<div class="field"><input name="spec_k[]" placeholder="عنوان مشخصه"></div>' +
        '<div class="field"><input name="spec_v[]" placeholder="مقدار"></div>';
      wrap.appendChild(row);
    });
  }

  /* افزودن خودروی سازگار */
  var addVehicle = document.getElementById('add-vehicle');
  if (addVehicle) {
    addVehicle.addEventListener('click', function () {
      var wrap = document.getElementById('vehicle-rows');
      if (!wrap) return;
      var first = wrap.querySelector('.vehicle-row');
      var row = first ? first.cloneNode(true) : null;
      if (row) {
        row.querySelectorAll('input, select').forEach(function (i) { i.value = ''; });
        wrap.appendChild(row);
      }
    });
  }

  /* حذف ردیف اضافه */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-remove-row]');
    if (b) { var row = b.closest('.row-holder'); if (row) row.remove(); }
  });
})();
