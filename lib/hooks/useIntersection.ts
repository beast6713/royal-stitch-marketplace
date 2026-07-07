import { useEffect, useState, useRef } from 'react';

export function useIntersection<T extends HTMLElement = HTMLDivElement>(options: IntersectionObserverInit = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const elementRef = useRef<T>(null);
  
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsIntersecting(true);
        // Usually for media you only need it to trigger once
        observer.unobserve(element);
      }
    }, {
      threshold: 0.1,
      rootMargin: "50px",
      ...options
    });
    
    observer.observe(element);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.root, options.rootMargin, options.threshold]);
  
  return { isIntersecting, elementRef };
}
