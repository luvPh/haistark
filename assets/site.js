// Shared behaviour: VI/EN switch (elements carry their English text in data-en) and in-page YouTube player.
(function () {
  var KEY = 'hai-lang';

  function apply(lang) {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-en]').forEach(function (el) {
      if (el.dataset.vi === undefined) el.dataset.vi = el.innerHTML;
      el.innerHTML = lang === 'en' ? el.dataset.en : el.dataset.vi;
    });
    document.querySelectorAll('[data-en-alt]').forEach(function (el) {
      if (el.dataset.viAlt === undefined) el.dataset.viAlt = el.getAttribute('alt') || '';
      el.setAttribute('alt', lang === 'en' ? el.dataset.enAlt : el.dataset.viAlt);
    });
    document.querySelectorAll('[data-lang-btn]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.langBtn === lang));
    });
    try { localStorage.setItem(KEY, lang); } catch (e) {}
  }

  function openPlayer(src) {
    var d = document.createElement('dialog');
    d.className = 'yt-modal';
    d.innerHTML = '<button class="yt-close" aria-label="Close">×</button><div class="yt-frame"><iframe src="' + src +
      '" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>';
    document.body.appendChild(d);
    d.addEventListener('close', function () { d.remove(); });
    d.addEventListener('click', function (e) { if (e.target === d || e.target.closest('.yt-close')) d.close(); });
    d.showModal();
  }

  var css = document.createElement('style');
  css.textContent =
    '.yt-modal{border:0;padding:0;background:transparent;width:min(1100px,94vw);max-width:none;overflow:visible}' +
    '.yt-modal::backdrop{background:rgba(0,0,0,.85);backdrop-filter:blur(4px)}' +
    '.yt-frame{aspect-ratio:16/9;background:#000}.yt-frame iframe{width:100%;height:100%;border:0}' +
    '.yt-close{position:absolute;top:-44px;right:0;background:none;border:0;color:#fff;font-size:36px;cursor:pointer;line-height:1}';
  document.head.appendChild(css);

  // execCommand runs synchronously inside the click, so it still works where the async
  // Clipboard API is denied (in-app browsers, blocked site permission); the API is the backup
  function legacyCopy(t) {
    var ta = document.createElement('textarea'), ok = false;
    ta.value = t; ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;font-size:16px';
    document.body.appendChild(ta);
    ta.select(); ta.setSelectionRange(0, t.length);
    try { ok = document.execCommand('copy'); } catch (e) {}
    ta.remove();
    return ok;
  }
  function copyText(t) {
    if (legacyCopy(t)) return Promise.resolve();
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(t);
    return Promise.reject();
  }
  function hint(wrap, key) {
    var txt = wrap.querySelector('.ch-txt'), en = document.documentElement.lang === 'en';
    txt.textContent = en ? txt.dataset[key + 'En'] : txt.dataset[key];
    wrap.classList.add('copied');
    clearTimeout(wrap._t);
    wrap._t = setTimeout(function () {
      txt.innerHTML = document.documentElement.lang === 'en' ? txt.dataset.en : txt.dataset.vi;
      wrap.classList.remove('copied');
    }, 2500);
  }

  document.addEventListener('click', function (e) {
    // clicking the email copies it; if the browser refuses, select it so it can be copied by hand
    var m = e.target.closest('[data-copy]');
    if (m) {
      e.preventDefault();
      var wrap = m.parentNode;
      copyText(m.dataset.copy).then(function () { hint(wrap, 'done'); }, function () {
        var r = document.createRange(), sel = getSelection();
        r.selectNodeContents(m); sel.removeAllRanges(); sel.addRange(r);
        hint(wrap, 'manual');
      });
      return;
    }
    var b = e.target.closest('[data-lang-btn]');
    if (b) { apply(b.dataset.langBtn); return; }
    var a = e.target.closest('[data-yt],[data-ytlist]');
    if (a && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      openPlayer(a.dataset.yt
        ? 'https://www.youtube-nocookie.com/embed/' + a.dataset.yt + '?autoplay=1'
        : 'https://www.youtube-nocookie.com/embed/videoseries?list=' + a.dataset.ytlist + '&autoplay=1');
    }
  });

  document.addEventListener('DOMContentLoaded', function () {
    var l = null;
    try { l = localStorage.getItem(KEY); } catch (e) {}
    apply(l === 'en' ? 'en' : 'vi');
  });
})();
