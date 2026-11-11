/* 이상한영어 리뉴얼 v2 · 동작 한 곳
   - 스크롤 연출은 GSAP ScrollTrigger(+MotionPath) + Lenis 가 맡고, 스크롤 이벤트를 직접 듣지 않는다.
   - 움직임 줄이기 설정이거나 라이브러리를 못 받으면 책을 낱장으로 펼쳐 보여 준다(내용은 그대로). */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = document.documentElement;
  const HEADER = () => parseFloat(getComputedStyle(root).getPropertyValue('--header')) || 64;
  const WEB3FORMS_KEY = 'ef0e3efd-8d61-4ddc-a211-6c9e29435f52';
  const SEND_TIMEOUT_MS = 15000;
  const PHONE_MQ = '(max-width: 767px)';   // 휴대폰 기준은 여기 한 곳(CSS 의 767px 와 같음)
  const WIDE_MQ = '(min-width: 768px)';
  const PAN_MQ = '(min-width: 1024px)';   // 커리큘럼 가로 넘김 기준

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const phone = matchMedia(PHONE_MQ);   // 휴대폰 판정은 이것 하나를 같이 쓴다
  const motion = !reduce && window.gsap && window.ScrollTrigger && window.MotionPathPlugin;

  /* ---------- 머리글 쪽제목 ---------- */
  const runhead = $('#runhead');
  let headNow = '';
  function setHead(str) {
    if (!str || str === headNow) return;
    headNow = str;
    const [b, t] = str.split('|');
    const bold = document.createElement('b');
    bold.textContent = b;
    runhead.replaceChildren(bold, t || '');
  }

  /* ---------- 부드러운 스크롤 + 앵커 ---------- */
  let lenis = null;
  if (motion && window.Lenis && !phone.matches) {   // 휴대폰은 브라우저 자체 스크롤 그대로(손가락 스크롤은 원래 매끄럽다)
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    const target = id === '#top' ? 0 : $(id);
    if (target === null) return;
    e.preventDefault();
    closeToc();
    if (lenis) lenis.scrollTo(target, { offset: target === 0 ? 0 : -HEADER() });
    else if (target === 0) scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  });

  /* ---------- 목차(휴대폰 메뉴) ---------- */
  const toc = $('#toc'), menuBtn = $('#menuBtn');
  function openToc() { toc.classList.add('open'); toc.setAttribute('aria-hidden', 'false'); menuBtn.setAttribute('aria-expanded', 'true'); lenis && lenis.stop(); $('#tocClose').focus(); }
  function closeToc() { if (!toc.classList.contains('open')) return; toc.classList.remove('open'); toc.setAttribute('aria-hidden', 'true'); menuBtn.setAttribute('aria-expanded', 'false'); lenis && lenis.start(); }
  menuBtn.addEventListener('click', openToc);
  $('#tocClose').addEventListener('click', closeToc);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeToc(); });

  /* ---------- 과정맵 칩 ---------- */
  const chips = $$('#cmapChips .chip');
  chips.forEach((chip) => chip.addEventListener('click', () => {
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    $('#cmapName').textContent = chip.textContent;
    $('#cmapDesc').textContent = chip.dataset.desc;
  }));

  /* ---------- 칼럼 읽기 창(책장의 책 · 여행 영어 링크가 같은 창을 연다) ---------- */
  const reader = $('#reader');
  $$('[data-col]').forEach((el) => el.addEventListener('click', () => {
    const data = $('#' + el.dataset.col).content;
    $('#readerMeta').textContent = $('.meta', data).textContent;
    $('#readerTitle').textContent = $('.title', data).textContent;
    $('#readerSub').textContent = $('.sub', data).textContent;
    $('#readerText').replaceChildren(...$$('p', $('.text', data)).map((p) => p.cloneNode(true)));
    reader.showModal();
    lenis && lenis.stop();
    $('.reader-body', reader).scrollTop = 0;
  }));
  $('#readerClose').addEventListener('click', () => reader.close());
  reader.addEventListener('click', (e) => { if (e.target === reader) reader.close(); });
  reader.addEventListener('close', () => lenis && lenis.start());

  /* ---------- 유튜브: 누르면 그 자리에서 재생(모든 영상 칸 공통) ---------- */
  $$('.play[data-yt]').forEach((btn) => btn.addEventListener('click', () => {
    const f = document.createElement('iframe');
    f.src = `https://www.youtube-nocookie.com/embed/${btn.dataset.yt}?autoplay=1&rel=0`;
    f.title = btn.getAttribute('aria-label');
    f.allow = 'autoplay; encrypted-media; picture-in-picture';
    f.allowFullscreen = true;
    btn.closest('.yt').appendChild(f);
    btn.remove();
  }));

  /* ---------- 후기 띠: 끊김 없이 돌도록 한 벌 더 붙인다 ---------- */
  $$('.mq-row').forEach((row) => {
    Array.from(row.children).forEach((card) => {
      const c = card.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      row.appendChild(c);
    });
  });

  /* ---------- 떠나기 전 걱정(휴대폰): 걱정을 누르면 해결이 펼쳐진다. 접고 펴는 모양은 CSS 휴대폰 블록, PC 는 늘 펼쳐 둔다 ---------- */
  (() => {
    const items = $$('#worry .pass').map((pass, i) => {
      const head = $('.pass-main', pass), stub = $('.pass-stub', pass);
      stub.id = 'passStub' + i;
      const toggle = () => {
        if (!phone.matches) return;
        head.setAttribute('aria-expanded', String(pass.classList.toggle('open')));
      };
      head.addEventListener('click', toggle);
      head.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
      // 펼친 만큼 아래 구간이 밀리므로 다 펼친 뒤 스크롤 연출 위치를 다시 잰다
      stub.addEventListener('transitionend', (e) => { if (e.propertyName === 'max-height' && motion) ScrollTrigger.refresh(); });
      return { pass, head, stub };
    });
    const setMode = () => items.forEach(({ pass, head, stub }) => {
      if (phone.matches) {
        head.setAttribute('role', 'button');
        head.tabIndex = 0;
        head.setAttribute('aria-expanded', String(pass.classList.contains('open')));
        head.setAttribute('aria-controls', stub.id);
      } else ['role', 'tabindex', 'aria-expanded', 'aria-controls'].forEach((a) => head.removeAttribute(a));
    });
    phone.addEventListener('change', setMode);
    setMode();
  })();

  /* ---------- 휴대폰 첫 방문 표지(모양·시간은 CSS): 끝나거나 누르면 걷어 낸다 ---------- */
  // 스크립트가 늦게 돌아도 놓치지 않게 「끝났다는 신호」 대신 애니메이션의 끝(finished)을 기다린다(이미 끝났으면 바로 걷힌다)
  const intro = $('#intro');
  const dropIntro = () => { intro.remove(); root.classList.remove('intro-on'); };
  const out = getComputedStyle(intro).display !== 'none' && intro.getAnimations ? intro.getAnimations().find((a) => a.animationName === 'introOut') : null;   // 못 찾으면 표지 없이 바로
  if (!out) dropIntro();
  else {
    out.finished.then(dropIntro, () => {});
    intro.addEventListener('click', () => intro.animate({ opacity: [1, 0] }, { duration: 250, easing: 'ease' }).finished.then(dropIntro));
  }

  initForm();
  initEar();

  /* ---------- 맨 아래 수강료·환불 규정: 여닫기는 CSS(:checked), 여기선 열린 칸으로 데려가기만 ---------- */
  $('#feeOpen').addEventListener('change', (e) => {
    if (motion) ScrollTrigger.refresh();   // 문서 길이가 바뀌므로 진행 띠 끝을 다시 잰다
    if (!e.target.checked) return;
    const label = $('label[for="feeOpen"]');
    if (lenis) { lenis.resize(); lenis.scrollTo(label, { offset: -HEADER() - 16 }); }   // 늘어난 길이를 먼저 알려야 끝에서 막히지 않는다
    else label.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  });

  /* ---------- 휴대폰: 스크롤에 묶인 스크립트를 쓰지 않는다 ----------
     손가락 스크롤은 브라우저가 GPU 로 굴리는데, 스크롤 위치를 읽어 매 프레임 다시 그리는 스크립트(화면 붙잡기·스크럽)는
     한 박자씩 늦게 따라와 덜덜 떨렸다. 휴대폰은 「화면에 들어오면 .in 을 붙이고, 움직임은 CSS(시간 기준)가」 맡는다(initPhone). */
  if (phone.matches) initPhone();
  else phone.addEventListener('change', (e) => { if (e.matches) initPhone(); }, { once: true });

  if (!motion) { flatBook(); return; }

  /* ================= 아래는 움직임이 켜진 경우만 ================= */
  gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);
  ScrollTrigger.config({ ignoreMobileResize: true });
  const mm = gsap.matchMedia();
  const hero = $('#top');

  /* 1. 첫 화면(PC): 책 → 종이비행기 → 하늘. 휴대폰은 initPhone + CSS */
  mm.add(WIDE_MQ, buildBook);

  function buildBook() {
    const book = $('#book'), copy = $('#heroCopy');
    const sky = $('#sky'), skyCopy = $('#skyCopy'), plane = $('#plane');
    const leaves = $$('.leaf', book), base = $('.base', book), nextPg = $('.pg', base), clouds = $$('.cloud', sky);
    const N = leaves.length, S = 0.82;
    const pw = () => book.offsetWidth / 2;
    const px = () => pw() / 2;          // 펼친 책에서 마지막 쪽 가운데까지
    const circle = (r) => () => `circle(${r}% at ${innerWidth / 2 + px()}px ${hero.offsetHeight / 2}px)`;
    leaves.forEach((l, i) => gsap.set(l, { zIndex: N - i }));

    const heroPose = { x: () => innerWidth * 0.22 - (pw() * S) / 2, y: 0, scale: S, rotationX: 8, rotationY: -22 };
    const closedPose = { x: () => -pw() / 2, y: 0, scale: 1, rotationX: 0, rotationY: 0 };

    const T = { open: 0.9, turn: 2.3, fold: 3.6, fly: 4.4, sky: 5.3 };
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: hero, start: 'top top', pin: true, scrub: 0.6, anticipatePin: 1, invalidateOnRefresh: true,
        end: () => '+=' + Math.round(tl.duration() * innerHeight * 0.7),
        onUpdate: (self) => {
          if (!self.isActive) return;   // 다시 재기(refresh) 때 책 구간 밖이면 다른 장의 쪽제목을 덮지 않는다
          const t = self.progress * tl.duration();
          setHead((t < T.open + 0.5 ? hero : t < T.fly + 0.3 ? book : sky).dataset.chapter);
        },
      },
    });

    tl.fromTo(book, heroPose, { ...closedPose, duration: 1, ease: 'power2.inOut' }, 0)
      .to(copy, { autoAlpha: 0, x: -60, duration: 0.6, ease: 'power1.in' }, 0)
      .to(book, { x: 0, y: 0, duration: 1, ease: 'power1.inOut' }, T.open);

    leaves.forEach((leaf, i) => {
      const at = i === 0 ? T.open : T.turn + (i - 1) * 1.45;
      const [front, back] = leaf.children;
      tl.to(leaf, { rotationY: -180, duration: 1, ease: 'power1.inOut' }, at)
        .to(front, { '--shade': 0.6, duration: 0.5, ease: 'power1.in' }, at)
        .fromTo(back, { '--shade': 0.6 }, { '--shade': 0, duration: 0.5, ease: 'power1.out', immediateRender: false }, at + 0.5)
        .set(leaf, { zIndex: 10 + i }, at + 0.5);
    });

    // 포기한 것들에 빨간 펜이 그어진다
    tl.fromTo($$('.lost li', book), { '--cross': 0 }, { '--cross': 1, duration: 0.25, stagger: 0.12, ease: 'power2.out' }, T.open + 0.85);

    // 마지막 쪽이 종이비행기로 접힌다 → 화면 쪽으로 날아오며 하늘이 원형으로 펼쳐진다
    tl.to(nextPg, { autoAlpha: 0, duration: 0.25 }, T.fold)
      .fromTo(base, { clipPath: 'polygon(100% 0%, 0% 0%, 0% 100%, 50% 100%, 100% 100%)' },
        { clipPath: 'polygon(100% 12%, 0% 46%, 20% 80%, 44% 62%, 58% 90%)', duration: 0.6, ease: 'power2.inOut' }, T.fold + 0.1)
      .fromTo(plane, { autoAlpha: 0, x: px, y: 0, scale: 1, rotation: 0 }, { autoAlpha: 1, duration: 0.12 }, T.fold + 0.62)
      .to(base, { autoAlpha: 0, duration: 0.12 }, T.fold + 0.66)
      .to(plane, { x: () => px() + innerWidth * 0.55, y: () => -innerHeight * 0.5, scale: 2.6, rotation: -14, duration: 1.3, ease: 'power2.in' }, T.fly)
      .to(plane, { autoAlpha: 0, duration: 0.2 }, T.fly + 1.15)
      .fromTo(sky, { clipPath: circle(0) }, { clipPath: circle(150), duration: 1.1, ease: 'power2.in' }, T.fly)
      .to(book, { y: () => innerHeight * 0.3, scale: 0.86, autoAlpha: 0, duration: 0.9, ease: 'power1.in' }, T.fly + 0.1)
      .fromTo(clouds, { scale: 0.6, autoAlpha: 0 }, { scale: 1.5, autoAlpha: 1, duration: 1.6, stagger: 0.08, ease: 'power1.out' }, T.fly)
      .fromTo(skyCopy, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power2.out' }, T.sky)
      .to({}, { duration: 0.6 });
  }

  /* 1-1. 표지의 빨간 펜: 고민 단어를 긋고 다음 단어로 */
  (() => {
    const rot = $('#rot'), word = $('.rot-word', rot), strike = $('.rot-strike', rot);
    const words = rot.dataset.words.split('|');
    const tl = gsap.timeline({ repeat: -1, delay: 1.2 });
    words.forEach((_, i) => {
      const next = words[(i + 1) % words.length];
      tl.fromTo(strike, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.55, ease: 'power2.out' }, '+=1.4')
        .to([word, strike], { autoAlpha: 0, y: -12, duration: 0.3, ease: 'power1.in' }, '+=0.35')
        .add(() => { word.textContent = next; })
        .set(strike, { clipPath: 'inset(0 100% 0 0)', y: 0, autoAlpha: 1 })
        // immediateRender:false — 만들자마자 '투명' 시작값을 걸면 첫 바퀴(약 4초) 동안 첫 단어가 안 보였다
        .fromTo(word, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power2.out', immediateRender: false });
    });
    ScrollTrigger.create({ trigger: hero, start: 'top top', end: () => '+=' + innerHeight * 0.4, onLeave: () => tl.pause(), onEnterBack: () => tl.play() });
  })();

  /* 2. 여행지 장면(PC) — 장면이 아래에서 올라와 겹친다(CSS sticky). 들어올 때 사진이 천천히 당겨지고, 사막에는 발자국이 하나씩 찍힌다.
     휴대폰은 initPhone + CSS */
  mm.add(WIDE_MQ, () => {
    const journey = $('#journey'), scenes = $$('.scene', journey);
    // 장면 k 가 문서에서 놓인 자리 = k × (장면 높이 + 머무는 간격). 간격은 CSS --dwell 한 곳에서 정한다
    const H = () => scenes[1].offsetHeight + parseFloat(getComputedStyle(scenes[1]).marginTop);
    const at = (k, edge) => () => `top+=${k * H()} ${edge}`;   // 장면 k 의 윗변이 화면 edge 에 닿는 자리
    scenes.forEach((sc, k) => {
      gsap.timeline({ scrollTrigger: { trigger: journey, start: at(k, 'bottom'), end: at(k, 'top'), scrub: 0.6, invalidateOnRefresh: true } })
        .fromTo($('.scene-img', sc), { scale: 1.18 }, { scale: 1, ease: 'none', duration: 1 }, 0)
        .fromTo($('.scene-copy', sc), { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, ease: 'power2.out', duration: 0.5 }, 0.45);
    });
    gsap.fromTo($$('#sceneDesert .fp'), { autoAlpha: 0 }, {
      autoAlpha: 1, stagger: 0.1, ease: 'none',
      scrollTrigger: { trigger: journey, start: 'top 30%', end: () => `top+=${H() * 0.75} top`, scrub: 0.6, invalidateOnRefresh: true },
    });
  });

  /* 3. 여행 지도(PC): 큰 지구본이 빙그르르 돌다가, 그 속으로 들어가듯 커지며 사라지고 지도 화면이 나타난다.
     이어서 경로가 그려지고 비행기가 도시를 따라 난다. 화면을 붙잡고 스크롤에 맞춘다. 휴대폰은 initPhone + CSS */
  mm.add(WIDE_MQ, () => {
    const stage = $('#mapStage'), content = $('.wrap', stage), globe = $('#globe'), spin = $('#globeSpin'), kite = $('.globe-plane', globe);
    const box = $('#mapBox'), masks = $$('.route-mask', box), routes = $$('.route', box), stops = $$('.city.stop', box), plane = $('#mapPlane');
    globe.hidden = false;
    gsap.set(masks, { strokeDashoffset: 1 });
    gsap.set(stops.slice(1), { autoAlpha: 0.3, scale: 0.5 });
    // 지구본 둘레를 도는 종이비행기: 앞쪽(아래 반)은 또렷하게, 뒤쪽(위 반)은 작고 흐리게. 화면에 있을 때만 돈다
    const orbit = gsap.timeline({ repeat: -1, paused: true, defaults: { ease: 'none' } })
      .to(kite, { motionPath: { path: '#orbitPath', align: '#orbitPath', alignOrigin: [0.5, 0.5], autoRotate: true }, duration: 10 }, 0)
      .to(kite, { autoAlpha: 0.15, scale: 0.7, duration: 0.6 }, 2.2)
      .to(kite, { autoAlpha: 1, scale: 1, duration: 0.6 }, 7.2);
    ScrollTrigger.create({ trigger: stage, start: 'top bottom', end: 'bottom top',
      onToggle: (s) => { globe.classList.toggle('on', s.isActive); stage.classList.toggle('live', s.isActive); if (s.isActive) orbit.play(); else orbit.pause(); } });

    const G = 1.6;   // 지구본 구간(스크롤 길이 비율). 그 뒤 경로 하나당 1
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: stage, start: 'top top', end: '+=230%', pin: true, scrub: 0.6, anticipatePin: 1 },
    });
    tl.fromTo(spin, { xPercent: 0 }, { xPercent: -100 / 3, duration: G, ease: 'power1.in' }, 0)                         // 한 바퀴 더, 점점 빠르게
      .fromTo(globe, { scale: 1, autoAlpha: 1 }, { scale: 3.2, autoAlpha: 0, duration: 0.7, ease: 'power2.in' }, G - 0.7)   // 지구본 속으로
      .fromTo(content, { autoAlpha: 0, scale: 0.94 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'power2.out' }, G - 0.45);
    const L = 0.6;   // 경로 하나의 길이(도시가 많아 짧게). 경로를 다 그리면 그 도시 불이 켜진다
    routes.forEach((r, i) => {
      tl.to(masks[i], { strokeDashoffset: 0, autoRound: false, duration: L }, G + i * L)   // autoRound:false — 0~1 사이 값이 정수로 반올림돼 한 번에 튀어나오지 않게
        .to(plane, { motionPath: { path: r, align: r, alignOrigin: [0.5, 0.5], autoRotate: true }, duration: L }, G + i * L)
        .to(stops[i + 1], { autoAlpha: 1, scale: 1, duration: 0.2, ease: 'back.out(2)' }, G + i * L + L * 0.85);
    });
    tl.to({}, { duration: 0.3 });
    return () => { orbit.kill(); globe.classList.remove('on'); globe.hidden = true; };
  });

  /* 4. 2:1(PC) — 빨간 펜 동그라미와 메모가 차례로. 휴대폰은 initPhone + CSS */
  mm.add(WIDE_MQ, () => {
    const ring = $('#two .ring');
    gsap.set(ring, { '--a': '0deg' });
    gsap.set(['#ann2', '#ann1', '#ratioCopy'], { autoAlpha: 0, y: 16 });
    gsap.timeline({
      defaults: { ease: 'power2.out' },
      scrollTrigger: { trigger: '#ratioStage', start: 'top top', end: '+=110%', pin: true, scrub: 0.6, anticipatePin: 1 },
    })
      .to(ring, { '--a': '360deg', duration: 1, ease: 'power1.inOut' })
      .to('#ann2', { autoAlpha: 1, y: 0, duration: 0.5 }, '-=0.3')
      .to('#ann1', { autoAlpha: 1, y: 0, duration: 0.5 }, '+=0.15')
      .to('#ratioCopy', { autoAlpha: 1, y: 0, duration: 0.6 }, '+=0.1')
      .to({}, { duration: 0.4 });
  });

  /* 5. 커리큘럼 — 넓은 화면에서는 목차를 옆으로 넘긴다 */
  mm.add(PAN_MQ, () => {
    const wrap = $('#trackWrap'), track = $('#track');
    wrap.classList.add('pan');
    const dist = () => Math.max(0, track.scrollWidth - innerWidth);
    gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: wrap, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.6, anticipatePin: 1, invalidateOnRefresh: true },
    })
      .to(track, { x: () => -dist() }, 0)
      .to('#rail', { scaleX: 1 }, 0);
    return () => wrap.classList.remove('pan');
  });

  /* 6. 나머지: 진행 띠 · 쪽제목 · 나타나기 · 숫자 · 잉크 글씨 · 교정 칸 · 휴대폰 아래 버튼 */

  const ink = $('#inkText');   // 잉크 글씨: 단어마다 감싸 두고(한 번), 번지는 움직임은 아래 PC 블록에서
  ink.replaceChildren(...ink.textContent.trim().split(/\s+/).flatMap((w, i) => {
    const s = document.createElement('span');
    s.className = 'w';
    s.textContent = w;
    return i ? [' ', s] : [s];
  }));

  // 진행 띠·쪽제목·나타나기·숫자 올라가기·잉크 글씨는 PC 만. 휴대폰 진행 띠는 CSS 스크롤 타임라인, 나머지는 처음부터 보인다
  mm.add(WIDE_MQ, () => {
    gsap.to('#progress', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: true } });
    $$('[data-chapter]').filter((s) => !hero.contains(s) && s !== hero).forEach((sec) => {
      ScrollTrigger.create({ trigger: sec, start: 'top center', end: 'bottom center', onToggle: (s) => s.isActive && setHead(sec.dataset.chapter) });
    });
    ScrollTrigger.batch('[data-reveal]', {
      start: 'top 88%', once: true,
      // 한 번에 건너뛴 경우(앵커·새로고침) 지나친 것은 바로 보이고, 화면 안의 것만 짧게 차례로 나온다
      onEnter: (els) => {
        const passed = [], inView = [];
        els.forEach((el) => (el.getBoundingClientRect().bottom < 0 ? passed : inView).push(el));
        if (passed.length) gsap.set(passed, { autoAlpha: 1, y: 0, overwrite: true });
        if (inView.length) gsap.to(inView, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'expo.out', overwrite: true, stagger: { amount: Math.min(0.4, 0.08 * (inView.length - 1)) } });
      },
    });

    const counts = $$('[data-count]').map((el) => {
      const to = parseFloat(el.dataset.count), dec = +(el.dataset.dec || 0);
      const fmt = (v) => v.toLocaleString('ko-KR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
      const o = { v: 0 };
      el.textContent = fmt(0);
      ScrollTrigger.create({
        trigger: el, start: 'top 90%', once: true,
        onEnter: () => gsap.to(o, { v: to, duration: 1.6, ease: 'power3.out', onUpdate: () => { el.textContent = fmt(o.v); } }),
      });
      return () => { el.textContent = fmt(to); };
    });

    gsap.to($$('#inkText .w'), { '--o': 1, stagger: 0.12, ease: 'none', scrollTrigger: { trigger: '#inkText', start: 'top 78%', end: 'bottom 42%', scrub: true } });
    return () => counts.forEach((show) => show());   // 휴대폰으로 바뀌면 숫자는 최종값으로
  });


  (() => {
    const box = $('#fixLive'), items = $$('p', box);
    items.forEach((p) => { p.hidden = false; p.style.gridArea = '1 / 1'; });
    box.style.display = 'grid';
    gsap.set(items, { autoAlpha: 0 });
    const tl = gsap.timeline({ repeat: -1, paused: true });
    items.forEach((p) => {
      tl.fromTo(p, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power2.out' })
        .fromTo($('.pen', p), { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.8, ease: 'power2.out' }, '+=0.5')
        .to(p, { autoAlpha: 0, y: -10, duration: 0.35, ease: 'power1.in' }, '+=1.8');
    });
    ScrollTrigger.create({ trigger: box, start: 'top bottom', end: 'bottom top', onToggle: (s) => (s.isActive ? tl.play() : tl.pause()) });
  })();

  ScrollTrigger.create({ trigger: '#journey', start: 'top bottom', endTrigger: '#cta', end: 'top 80%', toggleClass: { targets: '#mbar', className: 'show' } });

  document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());

  /* ================= 도우미 ================= */
  /* 휴대폰 연출 — 화면에 들어오면 클래스만 붙이고, 움직임·순서·시간은 CSS(style.css 「휴대폰 전용」)가 정한다.
     스크롤 위치를 미리 재지 않으므로(IntersectionObserver) 주소창이 접히거나 글꼴이 늦게 와도 어긋나지 않는다. */
  function initPhone() {
    // 두 방식 중 하나: html.sd(머리 스크립트가 정함) = 스크롤 연동 CSS 가 여행 사진·지도·2:1 을 움직인다 / 아니면 화면에 들어올 때 시간 기준 재생
    const sd = root.classList.contains('sd');
    const watch = (els, opts, fn) => { const io = new IntersectionObserver((es) => es.forEach((e) => fn(e, io)), opts); els.forEach((el) => io.observe(el)); };
    const once = (e, io) => { if (!e.isIntersecting) return; io.unobserve(e.target); e.target.classList.add('in'); };
    const kitePic = () => $('#plane svg').cloneNode(true);

    // 첫 화면: 버튼 아래 종이비행기가 떠 있다가, 조금 내리면 뾰옹 날아간다(다시 올리면 돌아온다)
    watch([$('#heroCopy')], { threshold: 0.9 }, (e) => $('#stage').classList.toggle('lift', e.intersectionRatio < 0.9));   // 문구가 10% 밀려 올라가면(약 40px)
    watch([$('#sky')], { threshold: 0.4 }, once);
    $$('#sceneDesert .fp').forEach((fp, i) => fp.style.setProperty('--i', i));

    // 지도: 보이는 동안만 도시가 깜박이고 지구본 둘레 종이비행기가 돈다(시간 기준, 작은 그림 하나)
    const stage = $('#mapStage'), globe = $('#globe');
    let orbit = null;
    if (motion) {
      globe.hidden = false;
      gsap.registerPlugin(MotionPathPlugin);
      orbit = gsap.to($('.globe-plane', globe), { motionPath: { path: '#orbitPath', align: '#orbitPath', alignOrigin: [0.5, 0.5], autoRotate: true }, duration: 9, ease: 'none', repeat: -1, paused: true });
    }
    watch([stage], { threshold: 0 }, (e) => { stage.classList.toggle('live', e.isIntersecting); if (orbit) { if (e.isIntersecting) orbit.play(); else orbit.pause(); } });

    if (sd) {
      // 움직임은 전부 CSS(스크롤 타임라인). 여기서는 사진 사이·빨간 불 사이를 나는 종이비행기 그림만 꽂는다
      $('#journey .j-fly').appendChild(kitePic());
      $('#mapBox .map-kite').appendChild(kitePic());
    } else {
      // 2:1 동그라미와 두 선생님 메모: 들어오면 한 번
      watch([$('#ratioStage')], { threshold: 0.4 }, once);
      // 여행 장면: 들어오면 .in(글이 떠오르고 사진이 천천히 흐르고 종이비행기가 가로지른다), 다음 장면이 올라오면 앞 장면 .past(스르르 사라짐)
      const scenes = $$('#journey .scene');
      scenes.forEach((sc) => { const kite = kitePic(); kite.classList.add('scene-plane'); sc.appendChild(kite); });
      watch(scenes, { threshold: 0.3 }, (e) => {
        e.target.classList.toggle('in', e.isIntersecting);
        const k = scenes.indexOf(e.target);
        if (k > 0) scenes[k - 1].classList.toggle('past', e.isIntersecting);
      });
      // 지도: 지구본이 화면에 보이면 #mapStage.in — 빙그르르 → 지구본 속으로 → 지도 → 경로(순서는 CSS 지연 시간)
      watch([motion ? globe : stage], { threshold: motion ? 0.6 : 0.3 }, (e, io) => { if (!e.isIntersecting) return; io.unobserve(e.target); stage.classList.add('in'); });
    }

    // 성장 그래프: 들어오면 한 번 — 선이 그려지며 종이비행기가 선을 타고 오르고, 단계 점·이름이 차례로(시간 기준)
    if (motion) {
      const box = $('#growChart'), line = $('.gc-line', box), plane = $('.gc-plane', box);
      const ride = (end) => ({ path: line, align: line, alignOrigin: [0.5, 0.5], autoRotate: true, start: 0, end });
      gsap.set(plane, { motionPath: ride(0) });   // 출발 전엔 선의 시작점에서 기다린다
      const tl = gsap.timeline({ paused: true })
        .fromTo(line, { strokeDashoffset: 1 }, { strokeDashoffset: 0, autoRound: false, duration: 1.8, ease: 'power1.inOut' }, 0)   // autoRound:false — 0~1 사이 값이 정수로 반올림돼 한 번에 튀지 않게
        .to(plane, { motionPath: ride(1), duration: 1.8, ease: 'power1.inOut' }, 0)
        .fromTo($('.gc-area', box), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.9 }, 0.7)
        .fromTo($$('.gc-dot', box), { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.35, stagger: 0.55, ease: 'back.out(2.2)' }, 0.05)
        .fromTo($$('.gc-tag', box), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.55 }, 0.6);
      watch([box], { threshold: 0.5 }, (e, io) => { if (!e.isIntersecting) return; io.unobserve(box); tl.play(); });
    }
  }

  function flatBook() {
    $('#top').classList.add('is-flat');
    $('#book').classList.add('book--flat');
    $$('[data-reveal]').forEach((el) => { el.style.opacity = 1; el.style.transform = 'none'; });
  }

  /* ---------- 귀 테스트: 소리 세 개 → 들린 문장 고르기 → 맞힌 개수로 레벨 ----------
     레벨 이름은 신청서 레벨 칸(#f-level)의 보기를 그대로 읽는다(맞힌 개수 0~3 = 보기 순서). */
  function initEar() {
    const EAR_VERDICT = [
      '왕초보 귀예요. 소리부터 차근차근 열어 가면 됩니다.',
      '초급 귀예요. 또박또박한 영어는 들립니다.',
      '초중급 귀예요. 연음까지 잡혔으니 이제 속도만 남았습니다.',
      '중급 귀예요. 원어민 속도도 들리는 귀입니다.',
    ];
    const ear = $('#ear');
    if (!ear) return;
    const qs = $$('.ear-q', ear), steps = $$('.ear-steps li', ear);
    const nav = $('#earNav'), result = $('#earResult'), live = $('#earLive');
    const levels = $$('#f-level option').map((o) => o.value).filter(Boolean);
    const relayout = () => motion && ScrollTrigger.refresh();   // 카드 높이가 바뀌면 아래 고정 구간 위치를 다시 잰다
    // 새로 나타난 버튼·재생 칸이 휴대폰 아래 고정 바(#mbar)에 가리거나 머리글 밑에 숨으면 보이는 데까지 부드럽게 옮긴다.
    // (가려진 「다음 소리 듣기」 대신 바의 「무료 체험 신청」이 눌려 신청서까지 날아갔다가 다시 올라와야 했던 원인)
    const bar = $('#mbar');
    const keepInView = (el) => {
      const r = el.getBoundingClientRect();
      const floor = innerHeight - (bar.classList.contains('show') ? bar.offsetHeight : 0) - 16, ceil = HEADER() + 12;
      const dy = r.bottom > floor ? Math.min(r.bottom - floor, r.top - ceil) : r.top < ceil ? r.top - ceil : 0;
      if (dy === 0) return;
      if (lenis) lenis.scrollTo(scrollY + dy);
      else scrollBy({ top: dy, behavior: reduce ? 'auto' : 'smooth' });
    };
    let cur = 0, score = 0, playing = null;

    $$('.ear-wave', ear).forEach((w) => {   // 소리 막대: 정해진 모양(무작위 없음)
      for (let i = 0; i < 28; i++) {
        const b = document.createElement('i');
        b.style.setProperty('--h', (0.3 + 0.7 * Math.abs(Math.sin(i * 0.55) * Math.cos(i * 0.21))).toFixed(2));
        b.style.setProperty('--d', ((i % 7) / 7).toFixed(2));
        w.appendChild(b);
      }
    });
    const stop = () => { if (playing && !playing.paused) playing.pause(); };

    qs.forEach((q) => {
      const audio = $('audio', q), player = $('.ear-player', q), btn = $('.ear-play', q), icon = $('i', btn);
      const set = (on) => { player.classList.toggle('playing', on); icon.className = on ? 'ph ph-pause' : 'ph ph-play'; };
      btn.addEventListener('click', () => {
        if (!audio.paused) { audio.pause(); return; }
        stop();
        playing = audio;
        audio.currentTime = 0;
        audio.play().catch(() => { live.textContent = '소리를 재생하지 못했어요. 한 번 더 눌러 주세요.'; });
      });
      audio.addEventListener('play', () => set(true));
      audio.addEventListener('pause', () => set(false));
      audio.addEventListener('error', () => { set(false); live.textContent = '소리를 불러오지 못했어요. 새로고침 뒤 다시 눌러 주세요.'; });

      $$('input', q).forEach((inp) => inp.addEventListener('change', () => {
        const ok = inp.value === q.dataset.answer;
        if (ok) score++;
        $$('.ear-opt', q).forEach((opt) => {
          const v = $('input', opt).value;
          $('input', opt).disabled = true;
          opt.classList.toggle('right', v === q.dataset.answer);
          opt.classList.toggle('wrong', v === inp.value && !ok);
        });
        steps[cur].classList.add(ok ? 'ok' : 'miss');
        $('.ear-answer', q).hidden = false;
        live.textContent = (ok ? '정답이에요. ' : '아쉬워요. 정답은 ') + $('.ear-mean', q).textContent;
        if (cur < qs.length - 1) { nav.hidden = false; $('#earNext').focus({ preventScroll: true }); }
        else finish();
        relayout();
        keepInView(cur < qs.length - 1 ? nav : $('.ear-actions', result));
      }));
    });

    function show(i) {
      stop();
      cur = i;
      qs.forEach((q, k) => q.classList.toggle('on', k === i));
      steps.forEach((s, k) => (k === i ? s.setAttribute('aria-current', 'step') : s.removeAttribute('aria-current')));
      nav.hidden = true;
    }
    function finish() {
      $('#earScore').textContent = score;
      $('#earVerdict').textContent = EAR_VERDICT[score];
      result.dataset.level = levels[score];
      result.hidden = false;
      live.textContent = `3문장 중 ${score}문장이 들렸어요. ${EAR_VERDICT[score]}`;
    }

    $('#earNext').addEventListener('click', () => {
      show(cur + 1);
      $('.ear-play', qs[cur]).focus({ preventScroll: true });
      relayout();
      keepInView($('.ear-player', qs[cur]));
    });
    $('#earRetry').addEventListener('click', () => {
      score = 0;
      result.hidden = true;
      qs.forEach((q) => {
        $$('input', q).forEach((inp) => { inp.checked = false; inp.disabled = false; });
        $$('.ear-opt', q).forEach((o) => o.classList.remove('right', 'wrong'));
        $('.ear-answer', q).hidden = true;
      });
      steps.forEach((s) => s.classList.remove('ok', 'miss'));
      show(0);
      $('.ear-play', qs[0]).focus({ preventScroll: true });
      relayout();
      keepInView($('.ear-player', qs[0]));
    });
    $('#earApply').addEventListener('click', () => {   // 화면 이동은 공통 #앵커 처리(Lenis)가 맡는다
      const sel = $('#f-level');
      sel.value = result.dataset.level;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    });
    show(0);
  }

  function initForm() {
    const form = $('#applyForm'), btn = $('#submitBtn'), msg = $('#formMsg');
    const F = { name: $('#f-name'), phone: $('#f-phone'), level: $('#f-level'), worry: $('#f-worry'), agree: $('#f-agree') };
    const say = (key, text) => {
      $('#e-' + key).textContent = text;
      const field = F[key].closest('.field');
      field && field.classList.toggle('bad', !!text);
    };
    ['name', 'phone', 'level'].forEach((k) => F[k].addEventListener('input', () => say(k, '')));
    F.agree.addEventListener('change', () => say('agree', ''));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      msg.textContent = '';
      const name = F.name.value.trim(), phone = F.phone.value.trim(), level = F.level.value, worry = F.worry.value.trim();
      const errs = {
        name: name ? '' : '이름을 입력해주세요.',
        phone: !phone ? '연락처를 입력해주세요.' : (/^[0-9\-+\s]{7,}$/.test(phone) ? '' : '올바른 연락처를 입력해주세요.'),
        level: level ? '' : '영어 레벨을 선택해주세요.',
        agree: F.agree.checked ? '' : '개인정보 수집 및 이용에 동의해주셔야 신청이 가능합니다.',
      };
      Object.entries(errs).forEach(([k, v]) => say(k, v));
      const first = Object.keys(errs).find((k) => errs[k]);
      if (first) { F[first].focus(); return; }

      btn.disabled = true;
      btn.firstChild.textContent = '신청 접수 중… ';
      const message = '=== 이상한영어 무료체험 신청 ===\n\n이름: ' + name + '\n연락처: ' + phone + '\n영어 레벨: ' + level +
        '\n현재 고민/편한 시간: ' + (worry || '미입력') + '\n\n신청 시각: ' + new Date().toLocaleString('ko-KR');
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), SEND_TIMEOUT_MS);
      try {
        const res = await fetch('https://api.web3forms.com/submit', {
          method: 'POST', signal: ctrl.signal,
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ access_key: WEB3FORMS_KEY, subject: '[이상한영어·무료체험] ' + name + ' 님', from_name: '이상한영어 신청', message }),
        });
        const j = await res.json();
        if (!j.success) throw new Error(j.message || '전송 실패');
        $('#doneName').textContent = name;
        $('#formSheet').classList.add('done');
      } catch (err) {
        msg.textContent = '전송 중 문제가 생겼습니다. 오른쪽 아래 카카오 채팅으로 남겨 주세요.';
        btn.disabled = false;
        btn.firstChild.textContent = '무료 체험 신청 ';
      } finally {
        clearTimeout(timer);
      }
    });
  }
})();
