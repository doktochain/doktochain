import { useTranslation } from 'react-i18next';

const brandsData = [
  {
    imageSrc: "/logo/Alberta_Health_Services.png",
    altText: "Alberta Health Services",
    link: "#",
  },
  {
    imageSrc: "/logo/MSP_BC.png",
    altText: "MSP British Columbia",
    link: "#",
  },
  {
    imageSrc: "/logo/ohip.png",
    altText: "Ontario Health Insurance Plan (OHIP)",
    link: "#",
  },
  {
    imageSrc: "/logo/ramq.png",
    altText: "RAMQ Quebec",
    link: "#",
  },
];

export default function Brands() {
  const { t } = useTranslation('frontend');

  const handleSeeMoreClick = () => {
    const searchbar = document.getElementById("insurance-section");
    const insuranceInput = document.getElementById("insurance-input");

    if (searchbar) {
      searchbar.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    setTimeout(() => {
      if (insuranceInput) {
        (insuranceInput as HTMLInputElement).focus();
      }
    }, 500);
  };

  return (
    <section className="bg-gray-100 py-16 w-full">
      <h2 className="text-center pb-8 text-lg font-semibold text-gray-600 tracking-wide uppercase">
        {t('brands.trustedBy')}
      </h2>
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex flex-wrap items-center justify-center gap-6">
          {brandsData.map((brand, i) => (
            <a
              key={i}
              href={brand.link}
              className="flex w-[180px] h-[80px] items-center justify-center bg-white border border-gray-200 rounded-lg transition-all duration-300 hover:shadow-lg hover:border-gray-300 p-4"
            >
              <img
                src={brand.imageSrc}
                alt={brand.altText}
                className="max-h-12 w-auto object-contain"
              />
            </a>
          ))}

          <button
            onClick={handleSeeMoreClick}
            className="text-blue-600 hover:text-blue-800 transition duration-300 font-medium text-base cursor-pointer"
          >
            {t('brands.seeMore')}
          </button>
        </div>
      </div>
    </section>
  );
}
