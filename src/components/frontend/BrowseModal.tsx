import { Fragment, useState } from 'react';
import { Dialog, Transition, Tab } from '@headlessui/react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LocalizedLink from '../LocalizedLink';

interface BrowseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BrowseModal({ isOpen, onClose }: BrowseModalProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { t } = useTranslation('frontend');

  const topSpecialties = [
    { name: t('browseModal.chiropractors'), href: '/frontend/browse/specialties/chiropractors' },
    { name: t('browseModal.dentists'), href: '/frontend/browse/specialties/dentists' },
    { name: t('browseModal.dermatologists'), href: '/frontend/browse/specialties/dermatology' },
    { name: t('browseModal.entDoctors'), href: '/frontend/browse/specialties/ent' },
    { name: t('browseModal.endocrinologists'), href: '/frontend/browse/specialties/endocrinology' },
    { name: t('browseModal.eyeDoctors'), href: '/frontend/browse/specialties/ophthalmology' },
    { name: t('browseModal.obgyns'), href: '/frontend/browse/specialties/obstetrics-gynecology' },
    { name: t('browseModal.ophthalmologists'), href: '/frontend/browse/specialties/ophthalmology' },
    { name: t('browseModal.optometrists'), href: '/frontend/browse/specialties/optometry' },
    { name: t('browseModal.orthopedicSurgeons'), href: '/frontend/browse/specialties/orthopedics' },
    { name: t('browseModal.podiatrists'), href: '/frontend/browse/specialties/podiatry' },
    { name: t('browseModal.primaryCareDoctors'), href: '/frontend/browse/specialties/family-medicine' },
    { name: t('browseModal.psychiatrists'), href: '/frontend/browse/specialties/psychiatry' },
    { name: t('browseModal.psychologists'), href: '/frontend/browse/specialties/psychology' },
    { name: t('browseModal.therapistCounselors'), href: '/frontend/browse/specialties/therapy' },
  ];

  const topProcedures = [
    { name: t('browseModal.annualPhysicalExam'), href: '/frontend/browse/procedures/annual-physical-exam' },
    { name: t('browseModal.bloodPressureCheck'), href: '/frontend/browse/procedures/blood-pressure-check' },
    { name: t('browseModal.echocardiogram'), href: '/frontend/browse/procedures/echocardiogram' },
    { name: t('browseModal.jointInjection'), href: '/frontend/browse/procedures/joint-injection' },
    { name: t('browseModal.skinCancerScreening'), href: '/frontend/browse/procedures/skin-cancer-screening' },
    { name: t('browseModal.telehealthConsultation'), href: '/frontend/browse/procedures/telehealth-consultation' },
    { name: t('browseModal.vaccination'), href: '/frontend/browse/procedures/vaccination' },
    { name: t('browseModal.xray'), href: '/frontend/browse/procedures/x-ray' },
  ];

  const handleLinkClick = () => {
    onClose();
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-start justify-center p-4 pt-20">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-5xl transform overflow-hidden rounded-2xl bg-white p-8 text-left align-middle shadow-xl transition-all">
                <div className="flex justify-end mb-4">
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <Tab.Group selectedIndex={selectedIndex} onChange={setSelectedIndex}>
                  <Tab.List className="flex space-x-8 border-b-2 border-gray-200 mb-6">
                    <Tab
                      className={({ selected }) =>
                        `pb-3 text-lg font-semibold outline-none transition-colors relative ${
                          selected
                            ? 'text-gray-900 border-b-2 border-gray-900 -mb-0.5'
                            : 'text-gray-500 hover:text-gray-700'
                        }`
                      }
                    >
                      {t('browseModal.specialties')}
                    </Tab>
                    <Tab
                      className={({ selected }) =>
                        `pb-3 text-lg font-semibold outline-none transition-colors relative ${
                          selected
                            ? 'text-gray-900 border-b-2 border-gray-900 -mb-0.5'
                            : 'text-gray-500 hover:text-gray-700'
                        }`
                      }
                    >
                      {t('browseModal.procedures')}
                    </Tab>
                  </Tab.List>

                  <Tab.Panels>
                    <Tab.Panel>
                      <div>
                        <h3 className="text-2xl font-semibold text-gray-900 mb-6">
                          {t('browseModal.browseTopSpecialties')}
                        </h3>
                        <div className="grid grid-cols-4 gap-x-8 gap-y-4">
                          {topSpecialties.map((specialty) => (
                            <LocalizedLink
                              key={specialty.name}
                              to={specialty.href}
                              onClick={handleLinkClick}
                              className="text-gray-700 hover:text-blue-600 hover:underline transition-colors"
                            >
                              {specialty.name}
                            </LocalizedLink>
                          ))}
                        </div>
                        <div className="mt-8 pt-6 border-t border-gray-200">
                          <LocalizedLink
                            to="/frontend/browse/specialties"
                            onClick={handleLinkClick}
                            className="text-blue-600 hover:text-blue-800 font-semibold hover:underline"
                          >
                            {t('browseModal.seeMoreSpecialties')}
                          </LocalizedLink>
                        </div>
                      </div>
                    </Tab.Panel>

                    <Tab.Panel>
                      <div>
                        <h3 className="text-2xl font-semibold text-gray-900 mb-6">
                          {t('browseModal.browseTopProcedures')}
                        </h3>
                        <div className="grid grid-cols-4 gap-x-8 gap-y-4">
                          {topProcedures.map((procedure) => (
                            <LocalizedLink
                              key={procedure.name}
                              to={procedure.href}
                              onClick={handleLinkClick}
                              className="text-gray-700 hover:text-blue-600 hover:underline transition-colors"
                            >
                              {procedure.name}
                            </LocalizedLink>
                          ))}
                        </div>
                        <div className="mt-8 pt-6 border-t border-gray-200">
                          <LocalizedLink
                            to="/frontend/browse/procedures"
                            onClick={handleLinkClick}
                            className="text-blue-600 hover:text-blue-800 font-semibold hover:underline"
                          >
                            {t('browseModal.seeMoreProcedures')}
                          </LocalizedLink>
                        </div>
                      </div>
                    </Tab.Panel>
                  </Tab.Panels>
                </Tab.Group>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
