import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';

export default function ScrollingText() {
  const { t } = useTranslation('frontend');
  const [index, setIndex] = useState(0);
  const [showText, setShowText] = useState(true);

  const messages = [
    t('scrollingText.msg1'),
    t('scrollingText.msg2'),
    t('scrollingText.msg3')
  ];

  useEffect(() => {
    const animateText = () => {
      setShowText(false);

      setTimeout(() => {
        setIndex((prevIndex) => (prevIndex + 1) % messages.length);
        setShowText(true);
      }, 3000);
    };

    const interval = setInterval(animateText, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto overflow-hidden py-2 px-4 rounded-lg">
      <AnimatePresence mode="wait">
        {showText && (
          <motion.div
            key={index}
            className="text-base font-semibold text-white text-center whitespace-nowrap"
            initial={{ x: "100%" }}
            animate={{ x: "-100%" }}
            exit={{ x: "-200%", opacity: 0 }}
            transition={{
              duration: 10,
              ease: "linear",
            }}
          >
            {messages[index]}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
