import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="absolute bottom-0 left-0 right-0 p-2 text-center text-[10px] sm:text-xs text-slate-500 bg-white/20 dark:bg-slate-900/20 backdrop-blur-sm z-10 pointer-events-auto">
      <span>
        Weavr &copy; {' '}
        <a
          href="https://www.linkedin.com/in/rolfmadsen/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-600 hover:underline inline-flex items-center font-medium"
        >
          Rolf Madsen
        </a>
        <span className="mx-2">2025</span>
        <span className="mx-2 opacity-30">|</span>
        <a
          href="mailto:contact@weavr.dk"
          className="text-purple-600 hover:underline font-medium"
        >
          contact@weavr.dk
        </a>
      </span>
    </footer>
  );
};

export default Footer;