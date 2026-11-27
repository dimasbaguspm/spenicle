import '@testing-library/jest-dom/vitest'

// jsdom has no layout, so anything that locks the body scroll (Ark's drawer and dialog)
// lands on a function that does not exist. Nothing under test depends on the scroll.
window.scrollTo = () => {
  /* no layout in jsdom: there is nothing to scroll */
}

// Ark measures what it renders (marquee width, scroll-area thumb, toc headings) through
// observers jsdom does not implement. A stub that never fires is exactly right: the
// components still mount, and no test asserts a measured size.
class NoopObserver {
  observe() {
    /* nothing is measured in jsdom */
  }

  unobserve() {
    /* nothing is measured in jsdom */
  }

  disconnect() {
    /* nothing is measured in jsdom */
  }
}

Object.assign(globalThis, {
  ResizeObserver: NoopObserver,
  IntersectionObserver: NoopObserver,
})
