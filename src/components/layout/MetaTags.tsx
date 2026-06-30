import { useEffect } from 'react';

interface MetaTagsProps {
  title: string;
  description: string;
  ogImage?: string;
  canonical?: string;
}

export default function MetaTags({ title, description, ogImage = 'https://valuescan.online/og-image.png', canonical }: MetaTagsProps) {
  useEffect(() => {
    document.title = title;
    
    const setMeta = (selector: string, content: string) => {
      let el = document.querySelector(selector) as HTMLMetaElement;
      if (!el) {
        el = document.createElement('meta');
        const prop = selector.includes('property=') ? 'property' : 'name';
        const val = selector.match(/"([^"]+)"/)?.[1] || '';
        el.setAttribute(prop, val);
        document.head.appendChild(el);
      }
      el.content = content;
    };

    setMeta('meta[name="description"]', description);
    setMeta('meta[property="og:title"]', title);
    setMeta('meta[property="og:description"]', description);
    setMeta('meta[property="og:image"]', ogImage);
    setMeta('meta[name="twitter:title"]', title);
    setMeta('meta[name="twitter:description"]', description);
    setMeta('meta[name="twitter:image"]', ogImage);

    if (canonical) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'canonical';
        document.head.appendChild(link);
      }
      link.href = canonical;
    }
  }, [title, description, ogImage, canonical]);

  return null;
}
