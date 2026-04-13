import { motion } from 'framer-motion';
import { Smartphone, Download, Bell, Calendar, FileText, MessageSquare } from 'lucide-react';

const appFeatures = [
  {
    icon: Calendar,
    title: 'Easy Booking',
    description: 'Book appointments with just a few taps'
  },
  {
    icon: Bell,
    title: 'Smart Reminders',
    description: 'Never miss an appointment with notifications'
  },
  {
    icon: FileText,
    title: 'Health Records',
    description: 'Access your medical history on the go'
  },
  {
    icon: MessageSquare,
    title: 'Secure Messaging',
    description: 'Chat with your healthcare providers'
  }
];

export default function MobileApp() {
  return (
    <section className="py-20 bg-gradient-to-br from-blue-700 via-blue-600 to-teal-600 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]"></div>

      <div className="max-w-7xl mx-auto px-6 sm:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-white"
          >
            <div className="inline-block bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
              <span className="text-sm font-semibold">📱 Download Our App</span>
            </div>

            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              Healthcare at Your Fingertips
            </h2>

            <p className="text-xl text-blue-100 mb-8">
              Take control of your health with our mobile app. Book appointments, access medical records,
              and connect with doctors anytime, anywhere.
            </p>

            <div className="grid grid-cols-2 gap-6 mb-8">
              {appFeatures.map((feature, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="bg-white/10 backdrop-blur-sm p-2 rounded-lg">
                    <feature.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">{feature.title}</h4>
                    <p className="text-sm text-blue-100">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <button className="bg-black text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center space-x-2 hover:bg-gray-900 transition-colors duration-300">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                <div className="text-left">
                  <div className="text-xs">Download on the</div>
                  <div className="text-sm font-bold">App Store</div>
                </div>
              </button>

              <button className="bg-black text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center space-x-2 hover:bg-gray-900 transition-colors duration-300">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.5,12.92 20.16,13.19L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                </svg>
                <div className="text-left">
                  <div className="text-xs">Get it on</div>
                  <div className="text-sm font-bold">Google Play</div>
                </div>
              </button>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white"></div>
                ))}
              </div>
              <div>
                <div className="flex items-center space-x-1">
                  <span className="text-yellow-300 text-lg">★★★★★</span>
                </div>
                <p className="text-sm text-blue-100">50K+ downloads with 4.9 rating</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-teal-400 rounded-3xl blur-3xl opacity-50"></div>
              <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20">
                <Smartphone className="w-full h-96 text-white/20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <Download className="w-24 h-24 mx-auto mb-4 animate-bounce" />
                    <p className="text-2xl font-bold">Download Now</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
