import { useRef, useEffect, useState } from "react";

interface StatsCardsProps {
  totalUsers: number;
  totalPokes: number;
  activeUsers: number;
}

export default function StatsCards({
  totalUsers,
  totalPokes,
  activeUsers,
}: StatsCardsProps) {
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Track scroll position for carousel indicator
  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const handleScroll = () => {
      const cards = carousel.querySelectorAll("[data-card-index]");
      if (cards.length === 0) return;

      const carouselRect = carousel.getBoundingClientRect();
      const carouselCenter = carouselRect.left + carouselRect.width / 2;

      let closestIndex = 0;
      let closestDistance = Infinity;

      cards.forEach((card, index) => {
        const cardRect = card.getBoundingClientRect();
        const cardCenter = cardRect.left + cardRect.width / 2;
        const distance = Math.abs(carouselCenter - cardCenter);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });

      setActiveCardIndex(closestIndex);
    };

    carousel.addEventListener("scroll", handleScroll);
    handleScroll(); // Initial call
    return () => carousel.removeEventListener("scroll", handleScroll);
  }, []);

  // Handle indicator click to scroll to card
  const scrollToCard = (index: number) => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const card = carousel.querySelector(`[data-card-index="${index}"]`);
    if (!card) return;

    const cardElement = card as HTMLElement;
    const carouselRect = carousel.getBoundingClientRect();
    const cardRect = cardElement.getBoundingClientRect();

    const scrollLeft =
      carousel.scrollLeft +
      (cardRect.left - carouselRect.left) -
      (carouselRect.width - cardRect.width) / 2;
    carousel.scrollTo({ left: scrollLeft, behavior: "smooth" });
  };

  return (
    <>
      {/* Desktop Stats Cards */}
      <div className="mb-8 md:grid md:grid-cols-3 md:gap-6 hidden">
        <div className="bg-[#181a1f] p-6 rounded-lg border border-[#2d323b] shadow-[inset_0_-2px_0_0_#23252a]">
          <div className="text-2xl font-bold text-white mb-1">
            {totalUsers.toLocaleString()}
          </div>
          <div className="text-[#6e7787]">
            <i className="fa-regular fa-users text-soft-blue mr-2"></i>
            Users
          </div>
        </div>

        <div className="bg-[#181a1f] p-6 rounded-lg border border-[#2d323b] shadow-[inset_0_-2px_0_0_#23252a]">
          <div className="text-2xl font-bold text-white mb-1">
            {totalPokes.toLocaleString()}
          </div>
          <div className="text-[#6e7787]">
            <i className="fa-regular fa-hand-pointer text-soft-blue mr-2"></i>
            Pokes
          </div>
        </div>

        <div className="bg-[#181a1f] p-6 rounded-lg border border-[#2d323b] shadow-[inset_0_-2px_0_0_#23252a]">
          <div className="text-2xl font-bold text-white mb-1">
            {activeUsers.toLocaleString()}
          </div>
          <div className="text-[#6e7787]">
            <i className="fa-regular fa-wave-pulse text-soft-blue mr-2"></i>
            Active Users
          </div>
        </div>
      </div>

      {/* Mobile Swipeable Stats Cards */}
      <div className="mb-6 md:hidden">
        <div
          ref={carouselRef}
          className="overflow-x-auto scrollbar-hide snap-x snap-mandatory"
        >
          <div className="flex gap-4 px-4 -mx-4">
            <div
              data-card-index="0"
              className="bg-[#181a1f] p-6 rounded-lg border border-[#2d323b] shadow-[inset_0_-2px_0_0_#23252a] min-w-[280px] snap-center flex-shrink-0"
            >
              <div className="text-2xl font-bold text-white">
                {totalUsers.toLocaleString()}
              </div>
              <div className="text-[#6e7787]">
                <i className="fa-regular fa-users text-soft-blue mr-2"></i>
                Total Users
              </div>
            </div>

            <div
              data-card-index="1"
              className="bg-[#181a1f] p-6 rounded-lg border border-[#2d323b] shadow-[inset_0_-2px_0_0_#23252a] min-w-[280px] snap-center flex-shrink-0"
            >
              <div className="text-2xl font-bold text-white">
                {totalPokes.toLocaleString()}
              </div>
              <div className="text-[#6e7787]">
                <i className="fa-regular fa-hand-pointer text-soft-blue mr-2"></i>
                Total Pokes
              </div>
            </div>

            <div
              data-card-index="2"
              className="bg-[#181a1f] p-6 rounded-lg border border-[#2d323b] shadow-[inset_0_-2px_0_0_#23252a] min-w-[280px] snap-center flex-shrink-0"
            >
              <div className="text-2xl font-bold text-white">
                {activeUsers.toLocaleString()}
              </div>
              <div className="text-[#6e7787]">
                <i className="fa-regular fa-wave-pulse text-soft-blue mr-2"></i>
                Active Users
              </div>
            </div>
          </div>
        </div>

        {/* Carousel Indicator Lines */}
        <div className="flex justify-center gap-2 mt-2">
          {[0, 1, 2].map((index) => (
            <button
              key={index}
              onClick={() => scrollToCard(index)}
              className={`fa-regular fa-minus transition-colors ${
                activeCardIndex === index ? "text-soft-blue" : "text-[#6e7787]"
              }`}
              aria-label={`Go to card ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </>
  );
}
