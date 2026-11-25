import "@testing-library/jest-dom/vitest";

// jsdom has no layout; the shell scrolls to the top on navigation.
window.scrollTo = () => {};
