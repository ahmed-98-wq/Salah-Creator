// light / dark theme
const themeToggle = document.querySelector('.theme-toggle');
const themeColorMeta = document.querySelector('meta[name="theme-color"]');
const systemDarkTheme = window.matchMedia('(prefers-color-scheme: dark)');

const applyTheme = (theme, saveChoice = false)=>{
  const isDark = theme === 'dark';
  if(isDark) document.documentElement.dataset.theme = 'dark';
  else delete document.documentElement.dataset.theme;

  if(themeToggle){
    themeToggle.setAttribute('aria-pressed', String(isDark));
    themeToggle.setAttribute('aria-label', isDark ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن');
    themeToggle.title = isDark ? 'الوضع الفاتح' : 'الوضع الداكن';
  }

  if(themeColorMeta) themeColorMeta.setAttribute('content', isDark ? '#111315' : '#F2ECDC');

  if(saveChoice){
    try {
      localStorage.setItem('salah-theme', theme);
    } catch (error) {}
  }
};

let hasSavedTheme = false;
try {
  hasSavedTheme = localStorage.getItem('salah-theme') !== null;
} catch (error) {}

applyTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

if(themeToggle){
  themeToggle.addEventListener('click', ()=>{
    const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    hasSavedTheme = true;
    applyTheme(nextTheme, true);
  });
}

const syncSystemTheme = (event)=>{
  if(!hasSavedTheme) applyTheme(event.matches ? 'dark' : 'light');
};

if(systemDarkTheme.addEventListener) systemDarkTheme.addEventListener('change', syncSystemTheme);
else systemDarkTheme.addListener(syncSystemTheme);

// header scroll state
const header = document.getElementById('siteHeader');
const updateHeader = ()=>{
  header.classList.toggle('scrolled', window.scrollY > 40);
};
window.addEventListener('scroll', updateHeader, { passive:true });
updateHeader();

// accessible mobile navigation
const burger = document.querySelector('.burger');
const mobileNav = document.getElementById('mobileNav');

const setMenu = (isOpen)=>{
  if(!burger || !mobileNav) return;
  burger.setAttribute('aria-expanded', String(isOpen));
  burger.setAttribute('aria-label', isOpen ? 'إغلاق قائمة التنقل' : 'فتح قائمة التنقل');
  mobileNav.classList.toggle('is-open', isOpen);
};

if(burger && mobileNav){
  burger.addEventListener('click', ()=>{
    setMenu(burger.getAttribute('aria-expanded') !== 'true');
  });
  document.addEventListener('click', (event)=>{
    if(!header.contains(event.target)) setMenu(false);
  });
  document.addEventListener('keydown', (event)=>{
    if(event.key === 'Escape'){
      setMenu(false);
      burger.focus();
    }
  });
  window.addEventListener('resize', ()=>{
    if(window.innerWidth > 980) setMenu(false);
  });
}

// reveal on scroll
const revealEls = document.querySelectorAll('.reveal, .circle-word, .service-card, .process-step');
if('IntersectionObserver' in window){
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        e.target.classList.add('in-view');
        io.unobserve(e.target);
      }
    });
  }, { threshold:.2 });
  revealEls.forEach(el=>io.observe(el));
}else{
  revealEls.forEach(el=>el.classList.add('in-view'));
}

// smooth nav close / anchor offset handled by scroll-behior + CSS scroll-margin
document.querySelectorAll('a[href^="#"]').forEach(a=>{
  a.addEventListener('click', function(ev){
    const id = this.getAttribute('href');
    if(id.length>1){
      const target = document.querySelector(id);
      if(target){
        ev.preventDefault();
        setMenu(false);
        window.scrollTo({ top: target.offsetTop - 90, behavior:'smooth' });
      }
    }
  });
});

// subtle parallax on hero photo group with mouse
const heroPhoto = document.querySelector('.hero-photo-wrap');
const hero = document.querySelector('.hero');
if(heroPhoto && hero && window.matchMedia('(pointer:fine)').matches){
  hero.addEventListener('mousemove', (e)=>{
    const r = window.innerWidth;
    const x = (e.clientX / r - .5) * 10;
    heroPhoto.style.transform = `translate(${x}px, ${x*0.4}px)`;
  });
  hero.addEventListener('mouseleave', ()=>{
    heroPhoto.style.transform = '';
  });
}

// infinite offers carousel on mobile
const offersCarousel = document.querySelector('.offers-carousel');
const offersViewport = document.querySelector('.offers-viewport');
const offerTrack = document.getElementById('offerTrack');
const offerControls = document.querySelector('.offer-carousel-controls');

if(offersCarousel && offersViewport && offerTrack && offerControls){
  const offerCards = [...offerTrack.querySelectorAll('.offer-card')];
  const prevOffer = offerControls.querySelector('.offer-arrow--prev');
  const nextOffer = offerControls.querySelector('.offer-arrow--next');
  const offerDots = offerControls.querySelector('.offer-dots');
  const mobileOffers = window.matchMedia('(max-width:720px)');
  const reducedOffersMotion = window.matchMedia('(prefers-reduced-motion:reduce)');
  let offerPosition = 1;
  let offerMoving = false;
  let offerTimer;
  let offerSettleTimer;
  let offerPointerStart;
  let offersAreVisible = !('IntersectionObserver' in window);
  let offersArePaused = false;

  const makeOfferClone = (card)=>{
    const clone = card.cloneNode(true);
    clone.classList.add('is-offer-clone');
    clone.classList.remove('reveal', 'reveal-d1', 'reveal-d2', 'reveal-d3', 'in-view');
    clone.setAttribute('aria-hidden', 'true');
    clone.querySelectorAll('a, button').forEach(el=>el.setAttribute('tabindex', '-1'));
    return clone;
  };

  offerTrack.prepend(makeOfferClone(offerCards[offerCards.length - 1]));
  offerTrack.append(makeOfferClone(offerCards[0]));
  const offerSlides = [...offerTrack.querySelectorAll('.offer-card')];
  offerControls.hidden = false;

  const dots = offerCards.map((card, index)=>{
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'offer-dot';
    dot.setAttribute('aria-label', `عرض الباقة ${index + 1}`);
    offerDots.appendChild(dot);
    return dot;
  });

  const realOfferIndex = ()=>{
    if(offerPosition === 0) return offerCards.length - 1;
    if(offerPosition === offerCards.length + 1) return 0;
    return offerPosition - 1;
  };

  const paintOfferState = ()=>{
    const active = realOfferIndex();
    dots.forEach((dot, index)=>{
      dot.classList.toggle('is-active', index === active);
      if(index === active) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
  };

  const positionOffer = (animate = true)=>{
    if(!mobileOffers.matches) return;
    const slide = offerSlides[offerPosition];
    const offset = slide.offsetLeft - (offersViewport.clientWidth - slide.offsetWidth) / 2;
    offerTrack.style.transition = animate && !reducedOffersMotion.matches ? '' : 'none';
    offerTrack.style.transform = `translate3d(${-Math.round(offset)}px, 0, 0)`;
    paintOfferState();
    if(!animate){
      window.requestAnimationFrame(()=>{
        offerTrack.style.transition = '';
      });
    }
  };

  const finishOfferLoop = ()=>{
    window.clearTimeout(offerSettleTimer);
    if(offerPosition === 0){
      offerPosition = offerCards.length;
      positionOffer(false);
    }else if(offerPosition === offerCards.length + 1){
      offerPosition = 1;
      positionOffer(false);
    }
    offerMoving = false;
  };

  const stopOfferAuto = ()=>window.clearTimeout(offerTimer);

  const scheduleOfferAuto = ()=>{
    stopOfferAuto();
    if(!mobileOffers.matches || reducedOffersMotion.matches || !offersAreVisible || offersArePaused || document.hidden) return;
    offerTimer = window.setTimeout(()=>{
      moveOffer(1);
    }, 4500);
  };

  const moveOffer = (direction)=>{
    if(!mobileOffers.matches || offerMoving) return;
    offerMoving = true;
    offerPosition += direction;
    positionOffer(true);
    window.clearTimeout(offerSettleTimer);
    offerSettleTimer = window.setTimeout(finishOfferLoop, reducedOffersMotion.matches ? 30 : 560);
    scheduleOfferAuto();
  };

  prevOffer.addEventListener('click', ()=>moveOffer(-1));
  nextOffer.addEventListener('click', ()=>moveOffer(1));
  dots.forEach((dot, index)=>{
    dot.addEventListener('click', ()=>{
      if(!mobileOffers.matches || offerMoving) return;
      offerMoving = true;
      offerPosition = index + 1;
      positionOffer(true);
      window.clearTimeout(offerSettleTimer);
      offerSettleTimer = window.setTimeout(()=>{
        offerMoving = false;
      }, reducedOffersMotion.matches ? 30 : 560);
      scheduleOfferAuto();
    });
  });

  offerTrack.addEventListener('transitionend', (event)=>{
    if(event.target === offerTrack && event.propertyName === 'transform') finishOfferLoop();
  });

  offersViewport.addEventListener('pointerdown', (event)=>{
    if(!mobileOffers.matches) return;
    offerPointerStart = event.clientX;
    stopOfferAuto();
  });

  offersViewport.addEventListener('pointerup', (event)=>{
    if(offerPointerStart == null) return;
    const distance = event.clientX - offerPointerStart;
    offerPointerStart = null;
    if(Math.abs(distance) > 45) moveOffer(distance < 0 ? 1 : -1);
    else scheduleOfferAuto();
  });

  offersViewport.addEventListener('pointercancel', ()=>{
    offerPointerStart = null;
    scheduleOfferAuto();
  });

  offersCarousel.addEventListener('mouseenter', ()=>{
    offersArePaused = true;
    stopOfferAuto();
  });

  offersCarousel.addEventListener('mouseleave', ()=>{
    offersArePaused = false;
    scheduleOfferAuto();
  });

  offersCarousel.addEventListener('focusin', ()=>{
    offersArePaused = true;
    stopOfferAuto();
  });

  offersCarousel.addEventListener('focusout', ()=>{
    offersArePaused = false;
    scheduleOfferAuto();
  });

  const updateOffersMode = ()=>{
    stopOfferAuto();
    offerMoving = false;
    offerPosition = 1;
    if(mobileOffers.matches){
      window.requestAnimationFrame(()=>positionOffer(false));
    }else{
      offerTrack.style.transition = '';
      offerTrack.style.transform = '';
    }
    paintOfferState();
    scheduleOfferAuto();
  };

  if(mobileOffers.addEventListener) mobileOffers.addEventListener('change', updateOffersMode);
  else mobileOffers.addListener(updateOffersMode);
  window.addEventListener('resize', ()=>{
    if(mobileOffers.matches) window.requestAnimationFrame(()=>positionOffer(false));
  }, { passive:true });
  document.addEventListener('visibilitychange', scheduleOfferAuto);

  if('IntersectionObserver' in window){
    const offersObserver = new IntersectionObserver((entries)=>{
      offersAreVisible = entries[0].isIntersecting;
      scheduleOfferAuto();
    }, { threshold:.25 });
    offersObserver.observe(offersCarousel);
  }

  paintOfferState();
  updateOffersMode();
}

// mobile featured-work carousel
const workCarousel = document.querySelector('.work-carousel');
const workTrack = document.getElementById('workTrack');
const workControls = document.querySelector('.work-carousel-controls');

if(workCarousel && workTrack && workControls){
  const workCards = [...workTrack.querySelectorAll('.work-card')];
  const prevWork = workControls.querySelector('.work-arrow--prev');
  const nextWork = workControls.querySelector('.work-arrow--next');
  const workDots = workControls.querySelector('.work-dots');
  const mobileWork = window.matchMedia('(max-width:720px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion:reduce)');
  let activeWork = 0;
  let autoWorkTimer;
  let scrollWorkFrame;
  let settleWorkTimer;
  let workIsVisible = !('IntersectionObserver' in window);
  let workIsPaused = false;
  let workIsLoopJumping = false;

  workCards.forEach((card, index)=>{
    card.dataset.workIndex = String(index);
  });

  const makeWorkClone = (card, index)=>{
    const clone = card.cloneNode(true);
    clone.classList.add('is-carousel-clone');
    clone.classList.remove('reveal', 'reveal-d1', 'reveal-d2', 'reveal-d3', 'reveal-d4', 'in-view');
    clone.dataset.workIndex = String(index);
    clone.setAttribute('aria-hidden', 'true');
    clone.setAttribute('tabindex', '-1');
    return clone;
  };

  const beforeWorkClones = workCards.map(makeWorkClone);
  const afterWorkClones = workCards.map(makeWorkClone);
  const beforeWorkFragment = document.createDocumentFragment();
  const afterWorkFragment = document.createDocumentFragment();
  beforeWorkClones.forEach((clone)=>beforeWorkFragment.appendChild(clone));
  afterWorkClones.forEach((clone)=>afterWorkFragment.appendChild(clone));
  workTrack.prepend(beforeWorkFragment);
  workTrack.append(afterWorkFragment);
  const workSlides = [...workTrack.querySelectorAll('.work-card')];

  workControls.hidden = false;

  const dots = workCards.map((card, index)=>{
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'work-dot';
    dot.setAttribute('aria-label', `عرض المشروع ${index + 1}`);
    workDots.appendChild(dot);
    return dot;
  });

  const paintWorkState = ()=>{
    dots.forEach((dot, index)=>{
      const isActive = index === activeWork;
      dot.classList.toggle('is-active', isActive);
      if(isActive) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
  };

  const stopWorkAuto = ()=>{
    window.clearTimeout(autoWorkTimer);
  };

  const centerWorkCard = (card, behavior = 'smooth')=>{
    const cardRect = card.getBoundingClientRect();
    const trackRect = workTrack.getBoundingClientRect();
    const offset = cardRect.left + cardRect.width / 2 - (trackRect.left + trackRect.width / 2);
    workTrack.scrollBy({ left:offset, behavior:reducedMotion.matches ? 'auto' : behavior });
  };

  const jumpToWorkCard = (card)=>{
    workIsLoopJumping = true;
    window.clearTimeout(settleWorkTimer);
    workTrack.style.scrollSnapType = 'none';
    workTrack.style.scrollBehavior = 'auto';

    const cardRect = card.getBoundingClientRect();
    const trackRect = workTrack.getBoundingClientRect();
    const offset = cardRect.left + cardRect.width / 2 - (trackRect.left + trackRect.width / 2);
    workTrack.scrollBy({ left:offset, behavior:'auto' });

    // Commit the invisible loop jump before scroll snapping is restored.
    void workTrack.offsetWidth;
    window.requestAnimationFrame(()=>{
      workTrack.style.scrollSnapType = '';
      workTrack.style.scrollBehavior = '';
      window.requestAnimationFrame(()=>{
        workIsLoopJumping = false;
      });
    });
  };

  const closestWorkSlide = ()=>{
    const trackRect = workTrack.getBoundingClientRect();
    const trackCenter = trackRect.left + trackRect.width / 2;
    let closest = workSlides[0];
    let closestDistance = Infinity;
    workSlides.forEach((card)=>{
      const rect = card.getBoundingClientRect();
      const distance = Math.abs(rect.left + rect.width / 2 - trackCenter);
      if(distance < closestDistance){
        closestDistance = distance;
        closest = card;
      }
    });
    return closest;
  };

  const normalizeWorkLoop = ()=>{
    if(!mobileWork.matches) return;
    const closest = closestWorkSlide();
    if(closest.classList.contains('is-carousel-clone')){
      activeWork = Number(closest.dataset.workIndex);
      paintWorkState();
      jumpToWorkCard(workCards[activeWork]);
    }
  };

  const scheduleWorkAuto = ()=>{
    stopWorkAuto();
    if(!mobileWork.matches || reducedMotion.matches || !workIsVisible || workIsPaused || document.hidden) return;
    autoWorkTimer = window.setTimeout(()=>{
      showWork(activeWork + 1, false);
      scheduleWorkAuto();
    }, 4500);
  };

  const showWork = (index, restartAuto = true, behavior = 'smooth')=>{
    let target;
    if(index < 0){
      activeWork = workCards.length - 1;
      target = beforeWorkClones[activeWork];
    }else if(index >= workCards.length){
      activeWork = 0;
      target = afterWorkClones[0];
    }else{
      activeWork = index;
      target = workCards[activeWork];
    }
    centerWorkCard(target, behavior);
    paintWorkState();
    window.clearTimeout(settleWorkTimer);
    settleWorkTimer = window.setTimeout(normalizeWorkLoop, behavior === 'auto' ? 0 : 650);
    if(restartAuto) scheduleWorkAuto();
  };

  const syncWorkFromScroll = ()=>{
    if(workIsLoopJumping) return;
    window.cancelAnimationFrame(scrollWorkFrame);
    scrollWorkFrame = window.requestAnimationFrame(()=>{
      const closest = closestWorkSlide();
      activeWork = Number(closest.dataset.workIndex);
      paintWorkState();
    });
    window.clearTimeout(settleWorkTimer);
    settleWorkTimer = window.setTimeout(normalizeWorkLoop, 140);
  };

  prevWork.addEventListener('click', ()=>showWork(activeWork - 1));
  nextWork.addEventListener('click', ()=>showWork(activeWork + 1));
  dots.forEach((dot, index)=>dot.addEventListener('click', ()=>showWork(index)));
  workTrack.addEventListener('scroll', syncWorkFromScroll, { passive:true });
  workTrack.addEventListener('scrollend', normalizeWorkLoop);
  ['pointerdown', 'touchstart', 'wheel'].forEach(eventName=>{
    workTrack.addEventListener(eventName, scheduleWorkAuto, { passive:true });
  });
  workCarousel.addEventListener('focusin', ()=>{
    workIsPaused = true;
    stopWorkAuto();
  });
  workCarousel.addEventListener('focusout', ()=>{
    workIsPaused = false;
    scheduleWorkAuto();
  });
  document.addEventListener('visibilitychange', scheduleWorkAuto);

  const updateWorkMode = ()=>{
    if(mobileWork.matches){
      window.requestAnimationFrame(()=>showWork(activeWork, false, 'auto'));
    }else{
      stopWorkAuto();
      workTrack.scrollTo({ left:0, behavior:'auto' });
    }
    scheduleWorkAuto();
  };

  if(mobileWork.addEventListener) mobileWork.addEventListener('change', updateWorkMode);
  else mobileWork.addListener(updateWorkMode);
  if(reducedMotion.addEventListener) reducedMotion.addEventListener('change', scheduleWorkAuto);

  if('IntersectionObserver' in window){
    const workObserver = new IntersectionObserver((entries)=>{
      workIsVisible = entries[0].isIntersecting;
      scheduleWorkAuto();
    }, { threshold:.25 });
    workObserver.observe(workCarousel);
  }

  paintWorkState();
  updateWorkMode();
}
