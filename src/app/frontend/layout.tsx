import { ReactNode } from 'react'
import 'react-phone-number-input/style.css'
import Navbar from '../../components/frontend/Navbar'

export default function FrontendLayout({children}:{children:ReactNode}) {
  return (
    <div className="overflow-x-hidden">
      <Navbar/>
      <main className="w-full min-h-screen overflow-x-hidden">{children}</main>
    </div>
  )
}
