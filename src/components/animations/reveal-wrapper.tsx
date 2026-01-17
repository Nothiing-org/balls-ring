'use client';

import { useEffect, useRef, useState } from 'react';

type RevealWrapperProps = {
  children: React.ReactNode;
  delay?: number;
  className?: string;
};

export default function RevealWrapper({ children, delay = 0, className }: RevealWrapperProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              setIsVisible(true);
            }, delay);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`${className} ${isVisible ? 'reveal-enter-active' : 'reveal-enter'}`}
    >
      {children}
    </div>
  );
}
