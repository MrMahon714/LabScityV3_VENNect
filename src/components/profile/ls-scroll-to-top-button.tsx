"use client";

import { ActionIcon, Affix, Transition } from "@mantine/core";
import { useReducedMotion, useWindowScroll } from "@mantine/hooks";
import { IconArrowUp } from "@tabler/icons-react";
import classes from "./ls-scroll-to-top-button.module.css";

const SHOW_AFTER_PX = 800;

const NAVBAR_HEIGHT_PX = 60;

export function LSScrollToTopButton() {
  const [scroll] = useWindowScroll();
  const reduceMotion = useReducedMotion();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  return (
    <Affix position={{ top: NAVBAR_HEIGHT_PX + 16, left: 24 }} zIndex={100}>
      <Transition
        transition="slide-down"
        mounted={scroll.y > SHOW_AFTER_PX}
        duration={reduceMotion ? 0 : 200}
      >
        {(transitionStyles) => (
          <div style={transitionStyles}>
            <ActionIcon
              className={classes.button}
              size={44}
              radius="xl"
              variant="filled"
              color="navy"
              aria-label="Scroll to top"
              title="Back to top"
              onClick={scrollToTop}
            >
              <IconArrowUp size={20} stroke={2} />
            </ActionIcon>
          </div>
        )}
      </Transition>
    </Affix>
  );
}