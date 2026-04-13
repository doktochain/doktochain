import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const testimonials = [
  {
    name: 'Sarah Mitchell',
    role: 'Patient',
    location: 'Toronto, ON',
    image: '/image/test1.png',
    rating: 5,
    text: 'Doktochain made it so easy to find a specialist who accepts my insurance. I booked an appointment in minutes and the video consultation was seamless. Highly recommend!',
    date: '2 weeks ago'
  },
  {
    name: 'Dr. James Chen',
    role: 'Family Physician',
    location: 'Vancouver, BC',
    image: '/image/doctor4.jpg',
    rating: 5,
    text: 'As a provider, Doktochain has transformed how I manage my practice. The automated reminders reduced no-shows by 75% and the telemedicine integration is fantastic.',
    date: '1 month ago'
  },
  {
    name: 'Emily Rodriguez',
    role: 'Patient',
    location: 'Montreal, QC',
    image: '/image/test2.png',
    rating: 5,
    text: 'I love having all my medical records in one place. The prescription refill feature is a game-changer. No more calling pharmacies or waiting on hold!',
    date: '3 weeks ago'
  },
  {
    name: 'Michael Thompson',
    role: 'Patient',
    location: 'Calgary, AB',
    image: '/image/test3.png',
    rating: 5,
    text: 'The platform is intuitive and the customer support is excellent. I was able to see a doctor the same day for an urgent issue. Thank you Doktochain!',
    date: '1 week ago'
  },
  {
    name: 'Dr. Lisa Park',
    role: 'Dermatologist',
    location: 'Ottawa, ON',
    image: '/image/doctor3.jpg',
    rating: 5,
    text: 'The patient communication tools have improved my practice efficiency significantly. My patients love the convenience of online booking and virtual visits.',
    date: '2 months ago'
  },
  {
    name: 'David Kumar',
    role: 'Patient',
    location: 'Edmonton, AB',
    image: '/image/doctor5.jpg',
    rating: 5,
    text: 'Finding a doctor who speaks my language and understands my cultural background was important to me. Doktochain made it easy with their detailed provider profiles.',
    date: '1 month ago'
  }
];

export default function Testimonials() {
  const { t } = useTranslation('frontend');
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <section className="py-20 bg-blue-600">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">{t('testimonials.title')}</h2>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            {t('testimonials.subtitle')}
          </p>
        </div>

        <div className="relative">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.slice(currentIndex, currentIndex + 3).map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-2xl p-8 shadow-xl"
              >
                <div className="flex items-center mb-4">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-16 h-16 rounded-full object-cover mr-4"
                  />
                  <div>
                    <h4 className="font-bold text-gray-900">{testimonial.name}</h4>
                    <p className="text-sm text-gray-600">{testimonial.role}</p>
                    <p className="text-xs text-gray-500">{testimonial.location}</p>
                  </div>
                </div>

                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                  <span className="ml-2 text-sm text-gray-500">{testimonial.date}</span>
                </div>

                <Quote className="w-8 h-8 text-blue-200 mb-2" />
                <p className="text-gray-700 leading-relaxed">{testimonial.text}</p>
              </motion.div>
            ))}
          </div>

          <div className="flex justify-center mt-8 space-x-4">
            <button
              onClick={prevTestimonial}
              className="bg-white text-blue-600 p-3 rounded-full hover:bg-blue-50 transition-colors duration-300 shadow-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={nextTestimonial}
              className="bg-white text-blue-600 p-3 rounded-full hover:bg-blue-50 transition-colors duration-300 shadow-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        <div className="text-center mt-12">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 inline-block">
            <div className="flex items-center justify-center space-x-8 text-white">
              <div>
                <div className="text-4xl font-bold">4.9</div>
                <div className="text-sm text-blue-100">{t('testimonials.averageRating')}</div>
              </div>
              <div className="h-12 w-px bg-white/30"></div>
              <div>
                <div className="text-4xl font-bold">50K+</div>
                <div className="text-sm text-blue-100">{t('testimonials.reviews')}</div>
              </div>
              <div className="h-12 w-px bg-white/30"></div>
              <div>
                <div className="text-4xl font-bold">98%</div>
                <div className="text-sm text-blue-100">{t('testimonials.satisfaction')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
