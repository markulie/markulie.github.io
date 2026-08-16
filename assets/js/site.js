/* =============================================================
   markulie.github.io — one script for every page.

   The old site pasted ~250 lines of this into each of nine files and
   toggled behaviour with per-page constants (PAGE_MODE,
   MINIGAME_ENABLED). Here the page declares what it wants in markup:

     <canvas id="flowField" data-game="true">   particles + collector
     <html data-theme="dark">                   palette, set in HTML

   Everything is feature-detected, so a page missing an element simply
   skips that block instead of throwing.
   ============================================================= */
;(function () {
  'use strict'

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  /* --- header: mobile drawer ---------------------------------- */
  var header = document.querySelector('.site-header')
  var toggle = document.getElementById('menuToggle')
  var nav = document.getElementById('siteNav')

  if (toggle && nav) {
    var setOpen = function (open) {
      nav.dataset.open = String(open)
      toggle.setAttribute('aria-expanded', String(open))
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu')
    }
    setOpen(false)

    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true')
    })
    Array.prototype.forEach.call(nav.querySelectorAll('a'), function (a) {
      a.addEventListener('click', function () {
        setOpen(false)
      })
    })
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false)
        toggle.focus()
      }
    })
    // Reset when crossing back to the desktop layout.
    window.matchMedia('(min-width: 769px)').addEventListener('change', function (e) {
      if (e.matches) setOpen(false)
    })
  }

  if (header) {
    var onScroll = function () {
      header.dataset.scrolled = String(window.scrollY > 8)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
  }

  /* --- brand label: backspace out, type the next role ---------- */
  var label = document.getElementById('brandLabel')
  if (label && !reduced) {
    var ROLES = ['TECH ARTIST', 'GAME PROGRAMMING']
    var HOLD = 2200 // pause on a complete word
    var BACK = 45 // ms per character deleted
    var TYPE = 90 // ms per character typed
    var GAP = 400 // beat between deleting and typing

    var role = 0
    var chars = ROLES[0].length
    var deleting = true
    var timer = 0

    var queue = function (ms) {
      timer = window.setTimeout(step, ms)
    }

    function step() {
      var word = ROLES[role]
      if (deleting) {
        chars--
        label.textContent = word.slice(0, chars)
        if (chars === 0) {
          deleting = false
          role = (role + 1) % ROLES.length
          return queue(GAP)
        }
        return queue(BACK)
      }
      chars++
      label.textContent = ROLES[role].slice(0, chars)
      if (chars === ROLES[role].length) {
        deleting = true
        return queue(HOLD)
      }
      queue(TYPE)
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) window.clearTimeout(timer)
      else queue(GAP)
    })
    queue(HOLD)
  }

  /* --- playa hero video --------------------------------------- */
  /* `autoplay` overrides `preload="none"`, so an inline src would pull
     18 MB on every visit, phones included. The still underneath is the
     real poster; the video attaches only when it is worth the bytes. */
  var video = document.getElementById('heroVideo')
  if (video && video.dataset.src) {
    var conn = navigator.connection
    var cheap = conn && conn.saveData === true
    var slow = conn && /(^|-)2g$/.test(conn.effectiveType || '')
    var wide = window.matchMedia('(min-width: 900px)').matches

    if (!cheap && !slow && !reduced && wide && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          if (!entries[i].isIntersecting) continue
          io.disconnect()
          video.src = video.dataset.src
          video.play().then(
            function () {
              video.setAttribute('data-playing', 'true')
            },
            function () {
              /* autoplay refused — the still stays, which is fine */
            },
          )
        }
      })
      io.observe(video)
    }
  }

  /* --- cursor-reactive particle field -------------------------- */
  var canvas = document.getElementById('flowField')
  if (!canvas) return

  var ctx = canvas.getContext('2d', { alpha: false })
  var GAME = canvas.dataset.game === 'true'
  var BASE_DENSITY = Number(canvas.dataset.density || 130)
  var btn = document.getElementById('targetHit')
  var hoverCapable = window.matchMedia('(hover: hover) and (pointer: fine)').matches

  function readPalette() {
    var s = getComputedStyle(document.documentElement)
    var pick = function (n, f) {
      return s.getPropertyValue(n).trim() || f
    }
    return {
      bg: pick('--void', '#0d0f10'),
      signal: pick('--signal', '#ff5a1f'),
      mono: pick('--mono', 'monospace'),
      dots: [
        pick('--blue', '#3e8ede'),
        pick('--green', '#4cc38a'),
        pick('--signal', '#ff5a1f'),
      ],
    }
  }
  var palette = readPalette()

  var W = 0
  var H = 0
  var dpr = 1

  /* Target is read from the collector button's real box, never a
     hardcoded coordinate — so the drawn circle and the clickable
     element cannot drift apart at any breakpoint. */
  var target = { x: 0, y: 0, r: 28 }
  function measureTarget() {
    if (!btn) return
    var r = btn.getBoundingClientRect()
    target.x = r.left + r.width / 2
    target.y = r.top + r.height / 2
    target.r = r.width / 2
  }

  var particles = []
  function seed() {
    var area = W * H
    var scale = Math.min(1, area / (1920 * 1080))
    var n = Math.max(45, Math.round(BASE_DENSITY * Math.max(0.45, scale)))
    particles = []
    for (var i = 0; i < n; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: 0,
        vy: 0,
        c: palette.dots[Math.floor(Math.random() * palette.dots.length)],
      })
    }
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    W = window.innerWidth
    H = window.innerHeight
    canvas.width = Math.round(W * dpr)
    canvas.height = Math.round(H * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0) // keeps the field crisp on retina
    measureTarget()
    if (GAME && !particles.length) seed()
    // Setting canvas.width wipes the bitmap, so always repaint.
    ctx.fillStyle = palette.bg
    ctx.fillRect(0, 0, W, H)
    if (GAME && reduced) drawFrame(false)
  }

  var mouse = { x: -9999, y: -9999 }
  if (hoverCapable) {
    window.addEventListener(
      'pointermove',
      function (e) {
        mouse.x = e.clientX
        mouse.y = e.clientY
      },
      { passive: true },
    )
    window.addEventListener('pointerleave', function () {
      mouse.x = -9999
      mouse.y = -9999
    })
  }

  var score = 0
  var flash = 0
  var bursts = []

  function collect(p) {
    score++
    flash = 1
    bursts.push({ x: target.x, y: target.y, r: target.r * 0.4, alpha: 0.5, c: p.c })
    var edge = Math.floor(Math.random() * 4)
    if (edge === 0) {
      p.x = 0
      p.y = Math.random() * H
    } else if (edge === 1) {
      p.x = W
      p.y = Math.random() * H
    } else if (edge === 2) {
      p.x = Math.random() * W
      p.y = 0
    } else {
      p.x = Math.random() * W
      p.y = H
    }
    p.vx = 0
    p.vy = 0
  }

  function release() {
    var n = Math.min(10, score)
    if (n <= 0) return
    score -= n
    flash = 1
    for (var i = 0; i < n; i++) {
      var p = particles[Math.floor(Math.random() * particles.length)]
      var a = Math.random() * Math.PI * 2
      var speed = 2 + Math.random() * 3
      p.x = target.x + Math.cos(a) * (target.r + 4)
      p.y = target.y + Math.sin(a) * (target.r + 4)
      p.vx = Math.cos(a) * speed
      p.vy = Math.sin(a) * speed
    }
  }
  if (btn) btn.addEventListener('click', release)

  function noise(x, y, t) {
    return Math.sin(x * 0.0025 + t) + Math.cos(y * 0.003 - t * 0.8)
  }

  var t = 0
  function drawFrame(advance) {
    ctx.globalAlpha = advance ? 0.18 : 1 // trail wash
    ctx.fillStyle = palette.bg
    ctx.fillRect(0, 0, W, H)
    ctx.globalAlpha = 1

    if (advance) t += 0.003

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i]
      if (advance) {
        var a = noise(p.x, p.y, t) * Math.PI
        p.vx += Math.cos(a) * 0.06
        p.vy += Math.sin(a) * 0.06

        var dx = p.x - mouse.x
        var dy = p.y - mouse.y
        var dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 140 && dist > 0.01) {
          var force = (1 - dist / 140) * 1.4
          p.vx += (dx / dist) * force
          p.vy += (dy / dist) * force
        }

        p.vx *= 0.9
        p.vy *= 0.9
        p.x += p.vx
        p.y += p.vy

        if (p.x < 0) p.x = W
        if (p.x > W) p.x = 0
        if (p.y < 0) p.y = H
        if (p.y > H) p.y = 0
      }

      ctx.fillStyle = p.c
      ctx.globalAlpha = 0.75
      ctx.beginPath()
      ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2)
      ctx.fill()

      if (advance) {
        var tdx = p.x - target.x
        var tdy = p.y - target.y
        if (Math.sqrt(tdx * tdx + tdy * tdy) < target.r) collect(p)
      }
    }
    ctx.globalAlpha = 1

    for (var b = bursts.length - 1; b >= 0; b--) {
      var burst = bursts[b]
      if (advance) {
        burst.r += 1.3
        burst.alpha -= 0.025
      }
      if (burst.alpha <= 0) {
        bursts.splice(b, 1)
        continue
      }
      ctx.strokeStyle = burst.c
      ctx.lineWidth = 1
      ctx.globalAlpha = burst.alpha
      ctx.beginPath()
      ctx.arc(burst.x, burst.y, burst.r, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.globalAlpha = 1

    ctx.fillStyle = palette.signal
    ctx.font = '400 ' + (14 + flash * 2) + "px " + palette.mono
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.globalAlpha = 0.55
    ctx.fillText(String(score), target.x, target.y + 1)
    ctx.globalAlpha = 1
    if (advance) flash *= 0.88
  }

  var raf = 0
  var running = false
  function loop() {
    drawFrame(true)
    raf = window.requestAnimationFrame(loop)
  }
  function start() {
    if (running || reduced || !GAME) return
    running = true
    loop()
  }
  function stop() {
    running = false
    window.cancelAnimationFrame(raf)
  }

  // Don't burn a rAF loop on a hidden tab.
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop()
    else start()
  })

  var resizeTimer = 0
  window.addEventListener('resize', function () {
    window.clearTimeout(resizeTimer)
    resizeTimer = window.setTimeout(resize, 120)
  })
  // Fixed elements still shift when a scrollbar appears or the mobile
  // URL bar collapses, so keep the target in sync.
  window.addEventListener('scroll', measureTarget, { passive: true })

  resize()
  start()
})()
