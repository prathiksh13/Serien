// How long the exit animation plays before navigation fires
export const NAV_EXIT_DURATION_MS = 380

export const pageShellVariants = {
  initial: { opacity: 0 },
  enter: {
    opacity: 1,
    transition: { duration: 0.22, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.18 },
  },
}

// Container that orchestrates child card stagger
export const pageCardContainerVariants = {
  initial: {
    transition: { staggerChildren: 0.04, staggerDirection: 1 },
  },
  enter: {
    transition: {
      staggerChildren: 0.07,
      staggerDirection: 1,
      delayChildren: 0.04,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.035,
      staggerDirection: -1,
    },
  },
}

// Individual card: fades + blurs on exit, slides + fades on enter
export const cardMotionVariants = {
  initial: {
    y: 32,
    opacity: 0,
    filter: 'blur(0px)',
  },
  enter: {
    y: 0,
    opacity: 1,
    filter: 'blur(0px)',
    transition: {
      duration: 0.42,
      ease: [0.22, 1, 0.36, 1],
    },
  },
  exit: {
    y: -16,
    opacity: 0,
    filter: 'blur(6px)',
    transition: {
      duration: 0.28,
      ease: [0.4, 0, 1, 1],
    },
  },
}

export const cardBackgroundVariants = {
  enter: {
    opacity: 1,
    transition: {
      duration: 0.25,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: [1, 0, 0],
    transition: {
      duration: 0.32,
      times: [0, 0.8, 1],
      ease: 'easeOut',
    },
  },
}

