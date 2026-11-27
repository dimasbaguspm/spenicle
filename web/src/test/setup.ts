import '@testing-library/jest-dom/vitest'

// jsdom has no layout, so anything that locks the body scroll (Ark's drawer and dialog)
// lands on a function that does not exist. Nothing under test depends on the scroll.
window.scrollTo = () => {
  /* no layout in jsdom: there is nothing to scroll */
}
