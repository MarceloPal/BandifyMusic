// Component inspired by Tom Miller from the GSAP community
// https://codepen.io/creativeocean/pen/NPWLwJM

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';

import './ScrambledText.css';

gsap.registerPlugin(SplitText, ScrambleTextPlugin);

const ScrambledText = ({
  radius = 100,
  duration = 1.2,
  speed = 0.5,
  scrambleChars = '.:',
  className = '',
  style = {},
  children,
}) => {
  const rootRef = useRef(null);

  useEffect(() => {
    if (!rootRef.current) return;

    const split = SplitText.create(rootRef.current.querySelector('p'), {
      type: 'chars',
      charsClass: 'char',
    });

    split.chars.forEach((c) => {
      gsap.set(c, { display: 'inline-block', attr: { 'data-content': c.innerHTML } });
    });

    // rAF throttle keeps getBoundingClientRect reads off the hot path
    let rafId = null;
    const handleMove = (e) => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        split.chars.forEach((c) => {
          const { left, top, width, height } = c.getBoundingClientRect();
          const dist = Math.hypot(e.clientX - (left + width / 2), e.clientY - (top + height / 2));
          if (dist < radius) {
            gsap.to(c, {
              overwrite: true,
              duration: duration * (1 - dist / radius),
              scrambleText: { text: c.dataset.content || '', chars: scrambleChars, speed },
              ease: 'none',
            });
          }
        });
      });
    };

    const el = rootRef.current;
    el.addEventListener('pointermove', handleMove);

    return () => {
      cancelAnimationFrame(rafId);
      el.removeEventListener('pointermove', handleMove);
      split.revert();
    };
  }, [radius, duration, speed, scrambleChars]);

  return (
    <div ref={rootRef} className={`text-block ${className}`} style={style}>
      <p>{children}</p>
    </div>
  );
};

export default ScrambledText;
