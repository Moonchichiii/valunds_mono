import { useEffect, useState, type JSX } from "react";

interface CarouselItem {
  image: string;
  title: string;
  subtitle: string;
  description: string;
}

interface CarouselProps {
  items: CarouselItem[];
  autoPlayInterval?: number;
}

export const Carousel = ({
  items,
  autoPlayInterval = 5000,
}: CarouselProps): JSX.Element => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev === items.length - 1 ? 0 : prev + 1));
    }, autoPlayInterval);

    return () => clearInterval(timer);
  }, [currentIndex, autoPlayInterval, items.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <div className="relative w-full overflow-hidden">
      <div className="relative h-[500px] lg:h-[600px] mt-[1px]">
        {items.map((item, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentIndex ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="relative w-full h-full">
              <img
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

              <div className="absolute bottom-0 left-0 right-0 p-8 lg:p-12 text-white">
                <div className="max-w-4xl">
                  <p className="text-sm font-medium uppercase tracking-wider mb-3 text-white/90">
                    {item.subtitle}
                  </p>
                  <h3 className="text-3xl lg:text-5xl font-semibold mb-4 tracking-tight">
                    {item.title}
                  </h3>
                  <p className="text-lg lg:text-xl text-white/90 leading-relaxed max-w-2xl">
                    {item.description}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
        {items.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`h-1.5 rounded-full transition-all duration-500 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent ${
              index === currentIndex
                ? "w-8 bg-white/90"
                : "w-1.5 bg-white/40 hover:bg-white/60"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};
