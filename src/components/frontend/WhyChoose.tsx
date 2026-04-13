import { motion } from 'framer-motion';
import { Users, Award, MapPin, Shield, Trophy, Headphones } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

function AnimatedCounter({ end, duration = 2000, suffix = '' }: { end: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = (currentTime - startTime) / duration;

      if (progress < 1) {
        setCount(Math.floor(end * progress));
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return (
    <span>
      {count.toLocaleString()}{suffix}
    </span>
  );
}

export default function WhyChoose() {
  const { t } = useTranslation('frontend');

  const stats = [
    { icon: Users, label: t('whyChoose.statActivePatients'), value: 152000, suffix: '+', color: 'text-blue-600' },
    { icon: Award, label: t('whyChoose.statVerifiedProviders'), value: 4500, suffix: '+', color: 'text-green-600' },
    { icon: MapPin, label: t('whyChoose.statCitiesServed'), value: 150, suffix: '+', color: 'text-teal-600' },
    { icon: Shield, label: t('whyChoose.statSecureConsultations'), value: 500000, suffix: '+', color: 'text-red-600' }
  ];

  const highlights = [
    {
      icon: Trophy,
      title: t('whyChoose.highlight1Title'),
      description: t('whyChoose.highlight1Desc'),
      bgColor: 'bg-yellow-50'
    },
    {
      icon: Shield,
      title: t('whyChoose.highlight2Title'),
      description: t('whyChoose.highlight2Desc'),
      bgColor: 'bg-blue-50'
    },
    {
      icon: Headphones,
      title: t('whyChoose.highlight3Title'),
      description: t('whyChoose.highlight3Desc'),
      bgColor: 'bg-green-50'
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">{t('whyChoose.title')}</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {t('whyChoose.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <stat.icon className={`w-12 h-12 ${stat.color} mx-auto mb-4`} />
                <div className={`text-4xl font-bold ${stat.color} mb-2`}>
                  <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-gray-600 font-medium">{stat.label}</div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {highlights.map((highlight, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className={`${highlight.bgColor} rounded-2xl p-8 text-center`}
            >
              <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 shadow-md">
                <highlight.icon className="w-8 h-8 text-gray-700" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{highlight.title}</h3>
              <p className="text-gray-600 leading-relaxed">{highlight.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
