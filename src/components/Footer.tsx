export default function Footer() {
  return (
    <footer className="bg-[#15171a] border-t border-[#1b2028] py-4 md:py-6">
      <div className="container mx-auto px-4 text-center">
        <a
          href="https://github.com/douvy/remilia-stats"
          className="text-[#b8bdc7] hover:text-white transition-colors border-b border-[#2d323b] pb-[1px] hover:border-[#b8bdc7]"
          target="_blank"
          rel="noopener noreferrer"
        >
          Star on GitHub
        </a>
      </div>
    </footer>
  );
}
