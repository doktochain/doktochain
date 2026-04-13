
import { useRef, useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function TabbedSection() {
  const { t } = useTranslation('frontend');

  const tabs = [
    { key: 'topBooked', label: t('tabbedSection.tabTopBooked') },
    { key: 'doctors', label: t('tabbedSection.tabDoctors') },
    { key: 'specialties', label: t('tabbedSection.tabSpecialties') },
    { key: 'symptoms', label: t('tabbedSection.tabSymptoms') },
  ];

  const servicesData: Record<string, { title: string; icon: string }[]> = {
    topBooked: [
      { title: t('tabbedSection.svcTelehealth'), icon: "📹" },
      { title: t('tabbedSection.svcWeightLoss'), icon: "⚖️" },
      { title: t('tabbedSection.svcVideoPrescription'), icon: "📜" },
      { title: t('tabbedSection.svcUtiConsult'), icon: "⚕️" },
      { title: t('tabbedSection.svcEdConsult'), icon: "🍆" },
      { title: t('tabbedSection.svcMentalHealth'), icon: "🌿" },
      { title: t('tabbedSection.svcUrgentCare'), icon: "❄️" },
    ],
    doctors: [
      { title: t('tabbedSection.svcGeneralPhysician'), icon: "🩺" },
      { title: t('tabbedSection.svcDermatologist'), icon: "💆‍♀️" },
      { title: t('tabbedSection.svcCardiologist'), icon: "❤️" },
      { title: t('tabbedSection.svcNeurologist'), icon: "🧠" },
    ],
    specialties: [
      { title: t('tabbedSection.svcEndocrinology'), icon: "🦷" },
      { title: t('tabbedSection.svcPediatrics'), icon: "👶" },
      { title: t('tabbedSection.svcOrthopedics'), icon: "🦴" },
    ],
    symptoms: [
      { title: t('tabbedSection.svcCoughFever'), icon: "🤒" },
      { title: t('tabbedSection.svcSkinRash'), icon: "🤕" },
      { title: t('tabbedSection.svcBackPain'), icon: "😖" },
    ],
  };

  const [activeTab, setActiveTab] = useState('topBooked');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;

      const canScroll = scrollWidth > clientWidth;
      setShowLeftArrow(canScroll && scrollLeft > 0);
      setShowRightArrow(canScroll && scrollLeft + clientWidth < scrollWidth);
    }
  };

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      handleScroll();
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [activeTab]);

  return (
    <section className="w-full py-10 pb-20 bg-gray-100 pl-10 relative">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 text-left mb-2">
          {t('tabbedSection.title')}
        </h1>
        <p className="text-gray-700 text-left mb-6">
          {t('tabbedSection.subtitle')}
        </p>

        <div className="flex overflow-x-auto scrollbar-hide space-x-4 pb-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`px-4 py-2 font-medium text-lg transition-colors duration-300 whitespace-nowrap ${
                activeTab === tab.key
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-900 hover:text-blue-600"
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full">
        {servicesData[activeTab]?.length > 0 && (
          <>
            {showLeftArrow && (
              <button
                onClick={() => scroll("left")}
                className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 bg-blue-400 text-white
                          p-3 rounded-full shadow-md hover:bg-blue-500 transition duration-300"
              >
                <ChevronLeft size={20} />
              </button>
            )}
          </>
        )}

        {servicesData[activeTab]?.length > 0 ? (
          <div
            ref={scrollContainerRef}
            className="mt-6 overflow-x-auto scrollbar-hide snap-x snap-mandatory w-full scroll-smooth"
          >
            <div className="flex gap-4 px-0 flex-nowrap">
              {servicesData[activeTab]?.map((service, index) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.0 }}
                  className="relative flex flex-col items-center justify-between min-w-[220px] h-[140px]
                            bg-blue-500 text-white rounded-lg p-6 transition-all duration-300 cursor-pointer
                            hover:bg-blue-600 hover:shadow-lg snap-center"
                >
                  <div className="w-12 h-12 flex items-center justify-center bg-blue-400 rounded-full text-2xl">
                    {service.icon}
                  </div>

                  <p className="font-semibold text-center mt-2">{service.title}</p>

                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    whileHover={{ opacity: 1, x: 0 }}
                    className="absolute bottom-3 right-3 text-white text-xl opacity-90 transition-opacity duration-300"
                  >
                    <ChevronRight />
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-center mt-4">{t('tabbedSection.noServices')}</p>
        )}

        {servicesData[activeTab]?.length > 0 && (
          <>
            {showRightArrow && (
              <button
                onClick={() => scroll("right")}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 bg-blue-400 text-white
                          p-3 rounded-full shadow-md hover:bg-blue-500 transition duration-300"
              >
                <ChevronRight size={20} />
              </button>
            )}
          </>
        )}
        </div>
      </div>
    </section>
  );
}
