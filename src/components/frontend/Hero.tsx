import Searchbar from "./Searchbar";
import { useNavigate } from 'react-router-dom';
import LocalizedLink from '../LocalizedLink';
import { useTranslation } from 'react-i18next';
import TransitionalText from "./TransitionalText";
import ScrollingText from "./ScrollingText";
import { SearchResult, InsuranceProvider, LocationCoordinates } from "../../services/unifiedSearchService";
import { motion } from 'framer-motion';
import { Shield, Clock, Users } from 'lucide-react';

const Hero = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('frontend');

  const handleSearch = (criteria: {
    searchResult: SearchResult | null;
    location: LocationCoordinates | null;
    insurance: InsuranceProvider | null;
  }) => {
    const params = new URLSearchParams();
    if (criteria.searchResult) {
      params.set('q', criteria.searchResult.name);
      params.set('type', criteria.searchResult.type);
      params.set('id', criteria.searchResult.id);
    }
    if (criteria.location) {
      params.set('city', criteria.location.city || '');
      params.set('province', criteria.location.province || '');
      params.set('lat', String(criteria.location.latitude));
      params.set('lng', String(criteria.location.longitude));
    }
    if (criteria.insurance) {
      params.set('insurance', criteria.insurance.name);
      params.set('insuranceId', criteria.insurance.id);
    }
    navigate(`/frontend/find-providers?${params.toString()}`);
  };

  const scrollToSearch = () => {
    const el = document.getElementById('hero-searchbar');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const input = el.querySelector('input');
      if (input) setTimeout(() => input.focus(), 400);
    }
  };

  return (
    <div className="relative bg-blue-800 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800" />
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 right-20 w-72 h-72 bg-white rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-teal-400 rounded-full blur-3xl" />
      </div>

      <div className="relative pt-24 sm:pt-28 lg:pt-32 pb-8">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
            <div className="flex-1 w-full lg:w-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <h1 className="text-4xl sm:text-5xl xl:text-6xl font-bold !leading-[1.15] text-white mb-6">
                  {t('hero.heading1')} <br />
                  <TransitionalText />
                  <br />
                  <span className="text-white">{t('hero.heading2')}</span>
                </h1>

                <p className="text-lg text-white mb-8 max-w-xl leading-relaxed">
                  {t('hero.description')}
                </p>

                <div className="flex flex-wrap items-center gap-4 mb-8">
                  <button
                    onClick={scrollToSearch}
                    className="inline-flex items-center justify-center rounded-lg bg-yellow-500 px-7 py-3.5 text-base font-semibold text-white hover:bg-yellow-600 transition-colors duration-200 shadow-lg shadow-yellow-500/30"
                  >
                    {t('hero.findDoctor')}
                  </button>
                  <LocalizedLink
                    to="/frontend/about"
                    className="inline-flex items-center justify-center px-6 py-3.5 text-base font-semibold text-white border border-white/30 rounded-lg hover:bg-white/10 transition-colors duration-200"
                  >
                    {t('hero.learnMore')}
                  </LocalizedLink>
                </div>

                <div className="flex items-center gap-6 text-white/90">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-green-400" />
                    <span className="text-sm">{t('hero.hipaaCompliant')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm">{t('hero.sameDayAppointments')}</span>
                  </div>
                  <div className="hidden sm:flex items-center gap-2">
                    <Users className="w-4 h-4 text-teal-300" />
                    <span className="text-sm">{t('hero.providersCount')}</span>
                  </div>
                </div>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex-shrink-0 z-10"
            >
              <img
                src="/image/dr_madu.png"
                alt="Healthcare professional"
                className="w-[280px] sm:w-[340px] md:w-[400px] lg:w-[440px] xl:w-[500px] drop-shadow-2xl mx-auto"
              />
            </motion.div>
          </div>
        </div>

        <div id="hero-searchbar" className="relative z-50 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 -mt-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Searchbar onSearch={handleSearch} showSearchButton={true} />
          </motion.div>
        </div>

        <div className="mt-8 overflow-hidden">
          <ScrollingText />
        </div>

        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 mt-8 pb-8">
          <div className="flex flex-wrap items-center gap-8 text-white">
            <div>
              <p className="text-2xl font-bold">15.2K</p>
              <p className="text-sm text-white">{t('hero.activePatients')}</p>
            </div>
            <div className="h-10 w-px bg-white/20" />
            <div>
              <p className="text-2xl font-bold">4.5K</p>
              <p className="text-sm text-white">{t('hero.activeSpecialists')}</p>
            </div>
            <div className="h-10 w-px bg-white/20" />
            <div>
              <p className="text-2xl font-bold">500K+</p>
              <p className="text-sm text-white">{t('hero.consultations')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
