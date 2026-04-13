import { useState } from 'react'
import {
  Dialog,
  DialogPanel,
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
} from '@headlessui/react'
import { useTranslation } from 'react-i18next'
import LocalizedLink from '../LocalizedLink'
import { LanguageToggle } from '../ui/LanguageToggle'
import BrowseModal from './BrowseModal'

import {
  Menu as MenuIcon,
  X,
  ChevronDown,
} from 'lucide-react'

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [browseModalOpen, setBrowseModalOpen] = useState(false)
  const { t } = useTranslation('nav')

  return (
    <>
      <header className="fixed top-0 left-0 w-full bg-blue-600 z-50">
        <nav aria-label="Global" className="mx-auto relative z-50 flex max-w-7xl items-center justify-between p-5 lg:px-8">

          <div className="hidden lg:flex lg:flex-1">
            <LocalizedLink to="/" className="-m-1.5 p-1.5">
              <span className="sr-only">Doktochain</span>
              <img
                alt="Doktochain Logo"
                src="/image/doktochain_logo.png"
                className="h-4 w-auto md:h-8"
              />
            </LocalizedLink>
          </div>

          <div className="hidden lg:flex lg:gap-x-1 lg:justify-end items-right lg:gap-x-4 ">
            <button
              onClick={() => setBrowseModalOpen(true)}
              className="flex items-center gap-x-2 text-base font-semibold text-gray-50 hover:bg-blue-700 px-4 py-3 rounded-md"
            >
              {t('navbar.browse')}
              <ChevronDown aria-hidden="true" className="flex-none text-gray-300" size={18} />
            </button>

            <LocalizedLink to="/frontend/about" className="hover:bg-blue-700 px-4 py-3 rounded-md text-sm/6 font-semibold text-gray-50">
              {t('navbar.about')}
            </LocalizedLink>

            <LocalizedLink to="/frontend/help" className="hover:bg-blue-700 px-4 py-3 rounded-md text-sm/6 font-semibold text-gray-50">
              {t('navbar.help')}
            </LocalizedLink>

            <LocalizedLink to="/for-business" className="hover:bg-blue-700 px-4 py-3 rounded-md text-sm/6 font-semibold text-gray-50">
              {t('navbar.listYourBusiness')}
            </LocalizedLink>
          </div>

          <div className="hidden lg:flex lg:flex-1 lg:justify-end items-center gap-3">
            <Menu as="div" className="relative">
              <MenuButton className="hover:bg-blue-700 text-gray-50 font-semibold px-3 py-2.5 rounded-md flex items-center text-sm/6">
                {t('navbar.logIn')} <span aria-hidden="true" className="ml-1">&rarr;</span>
              </MenuButton>
              <MenuItems className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 shadow-lg rounded-md">
                <div className="p-4 space-y-2">
                  <div>
                    <p className="px-4 py-3 text-gray-500 font-semibold">{t('navbar.patients')}</p>
                    <MenuItem>
                      {({ focus }) => (
                        <LocalizedLink to="/login" className={`w-full text-left block px-4 py-3 text-gray-800 rounded-md ${focus ? 'bg-gray-100' : ''}`}>
                          {t('navbar.logIn')}
                        </LocalizedLink>
                      )}
                    </MenuItem>
                  </div>
                  <hr className="border-gray-200" />
                  <div>
                    <p className="px-4 py-3 text-gray-500 font-semibold">{t('navbar.providers')}</p>
                    <MenuItem>
                      {({ focus }) => (
                        <LocalizedLink to="/provider/login" className={`w-full text-left block px-4 py-3 text-gray-800 rounded-md ${focus ? 'bg-gray-100' : ''}`}>
                          {t('navbar.logIn')}
                        </LocalizedLink>
                      )}
                    </MenuItem>
                  </div>
                </div>
              </MenuItems>
            </Menu>

            <LocalizedLink to="/register" className="bg-yellow-400 text-white font-medium py-2.5 px-5 rounded-md hover:bg-yellow-500 text-sm/6">
              {t('navbar.signUp')}
            </LocalizedLink>

            <LanguageToggle variant="light" />
          </div>

          <div className="flex lg:hidden justify-end w-full">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="inline-flex items-center justify-center rounded-lg p-3 text-white bg-blue-700 hover:bg-blue-600"
            >
              <span className="sr-only">Open main menu</span>
              <MenuIcon className="text-gray-50" size={32} />
            </button>
          </div>
        </nav>

        <Dialog open={mobileMenuOpen} onClose={setMobileMenuOpen} className="lg:hidden">
          <div className="fixed inset-0 z-20" />
          <DialogPanel className="fixed inset-y-0 right-0 z-30 w-full overflow-y-auto bg-blue-800 px-6 pt-24 pb-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
            <div className="absolute top-5 right-6 flex items-center justify-end">
              <button onClick={() => setMobileMenuOpen(false)} className="-m-2.5 rounded-md p-2.5 text-gray-50">
                <X size={24} />
              </button>
            </div>

            <div className="flow-root">
              <div className="-my-6 divide-y divide-gray-600">
                <div className="space-y-2 py-6">
                  <div className="px-3 py-2">
                    <LanguageToggle variant="light" />
                  </div>

                  <button
                    onClick={() => {
                      setBrowseModalOpen(true)
                      setMobileMenuOpen(false)
                    }}
                    className="block rounded-lg py-2 px-3 text-base font-semibold text-gray-50 hover:bg-blue-700 w-full text-left"
                  >
                    {t('navbar.browse')}
                  </button>

                  <LocalizedLink
                    to="/frontend/about"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block rounded-lg py-2 px-3 text-base font-semibold text-gray-50 hover:bg-blue-700"
                  >
                    {t('navbar.about')}
                  </LocalizedLink>

                  <LocalizedLink
                    to="/frontend/help"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block rounded-lg py-2 px-3 text-base font-semibold text-gray-50 hover:bg-blue-700"
                  >
                    {t('navbar.help')}
                  </LocalizedLink>

                  <LocalizedLink
                    to="/for-business"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block rounded-lg py-2 px-3 text-base font-semibold text-gray-50 hover:bg-blue-700"
                  >
                    {t('navbar.forBusiness')}
                  </LocalizedLink>
                </div>

                <div className="space-y-2 py-6">
                  <Disclosure>
                    {() => (
                      <>
                        <DisclosureButton className="flex w-full justify-between rounded-lg px-3 py-2 text-base font-semibold text-gray-50 hover:bg-blue-700">
                          {t('navbar.logIn')} <span aria-hidden="true">&rarr;</span>
                        </DisclosureButton>
                        <DisclosurePanel className="mt-2 space-y-2 bg-white shadow-md rounded-md p-4">
                          <p className="text-gray-500 font-semibold">{t('navbar.patients')}</p>
                          <LocalizedLink
                            to="/login"
                            onClick={() => setMobileMenuOpen(false)}
                            className="block py-2 px-4 text-gray-800 hover:bg-gray-100 rounded-md w-full"
                          >
                            {t('navbar.logIn')}
                          </LocalizedLink>
                          <hr className="my-2 border-gray-200" />
                          <p className="text-gray-500 font-semibold">{t('navbar.providers')}</p>
                          <LocalizedLink
                            to="/provider/login"
                            onClick={() => setMobileMenuOpen(false)}
                            className="block py-2 px-4 text-gray-800 hover:bg-gray-100 rounded-md w-full"
                          >
                            {t('navbar.logIn')}
                          </LocalizedLink>
                        </DisclosurePanel>
                      </>
                    )}
                  </Disclosure>

                  <LocalizedLink
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full bg-yellow-400 text-white font-medium py-3 px-6 hover:bg-yellow-500 rounded-md text-center"
                  >
                    {t('navbar.signUp')}
                  </LocalizedLink>
                </div>
              </div>
            </div>
          </DialogPanel>
        </Dialog>
      </header>

      <BrowseModal isOpen={browseModalOpen} onClose={() => setBrowseModalOpen(false)} />
    </>
  )
}
