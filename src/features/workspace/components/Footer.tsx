import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="absolute bottom-0 left-0 right-0 p-2 text-center text-[10px] sm:text-xs text-gray-500 bg-gray-50/80 backdrop-blur-sm z-10 pointer-events-auto">
      <span>
        Weavr &copy; {' '}
        <a
          href="https://www.linkedin.com/in/rolfmadsen/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 hover:underline inline-flex items-center"
        >
          Rolf Madsen
        </a>
        <span className="mx-2">2025</span>
        <span className="mx-2">|</span>
        <a
          href="mailto:support@weavr.dk"
          className="text-indigo-600 hover:underline"
        >
          support@weavr.dk
        </a>
      </span>
    </footer>
  );
};

export default Footer;