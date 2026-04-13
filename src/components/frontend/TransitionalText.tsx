import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';

export default function TransitionalText() {
  const { t } = useTranslation('frontend');
  const [index, setIndex] = useState(0);

  const TEXTS = [
    t('transitionalText.therapist'), t('transitionalText.acupuncture'),
    t('transitionalText.doctor'), t('transitionalText.gynecologist'),
    t('transitionalText.massage'), t('transitionalText.dentist'),
    t('transitionalText.chiropractor'), t('transitionalText.optician'),
    t('transitionalText.dermatologist'), t('transitionalText.ayurveda')
  ];

  useEffect(() => {
    const intervalId = setInterval(() => {
      setIndex((prevIndex) => (prevIndex + 1) % TEXTS.length);
    }, 3000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <motion.span
      key={index}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.5 }}
      className="text-yellow-500 font-bold"
    >
      {TEXTS[index]}
    </motion.span>
  );
}
