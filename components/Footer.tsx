import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="absolute bottom-0 left-0 right-0 p-2 text-center text-[10px] sm:text-xs text-gray-500 bg-gray-50/80 backdrop-blur-sm z-10 pointer-events-auto">
      <span>
        Weavr &copy; Rolf Madsen 2025{' '}
        <a
          href="https://www.linkedin.com/in/rolfmadsen/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 hover:underline"
        >
          LinkedIn
        </a>
      </span>
    </footer>
  );
};

export default Footer;