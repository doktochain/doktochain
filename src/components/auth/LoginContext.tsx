import { createContext, useContext, useState, ReactNode} from 'react'
import LoginForm from './LoginForm1'
import NewRegistrationFlow from './NewRegistrationFlow'

// Define the structure of the login context
type LoginContextType = {
  openLogin: () => void          // Opens the login popup
  openRegister: () => void       // Opens the registration popup
  closeLogin: () => void         // Closes the login/register popup
  isRegister: boolean            // Determines if the form is in "register" mode
  setIsRegister: (val: boolean) => void // Toggles between login and register modes
}

// Create a React context with the defined type
const LoginContext = createContext<LoginContextType | undefined>(undefined)

// Context provider that wraps parts of the app needing access to login/register state
export function LoginProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)         // Tracks popup visibility
  const [isRegister, setIsRegister] = useState(false) // Tracks form mode (login/register)

  // Open login popup and ensure it shows login form
  const openLogin = () => {
    setIsRegister(false)
    setIsOpen(true)
  }

  // Open register popup and switch to registration form
  const openRegister = () => {
    setIsRegister(true)
    setIsOpen(true)
  }

  // Close the popup
  const closeLogin = () => setIsOpen(false)

  return (
    <LoginContext.Provider value={{ openLogin, openRegister, closeLogin, isRegister, setIsRegister }}>
      {children}
      {/* Conditionally render the login/register popup */}
      {isOpen && !isRegister && <LoginForm onClose={closeLogin} />}
      {isOpen && isRegister && (
        <NewRegistrationFlow
          onClose={closeLogin}
          onSwitchToLogin={() => setIsRegister(false)}
        />
      )}
    </LoginContext.Provider>
  )
}

// Hook to consume the login context safely
export function useLogin() {
  const context = useContext(LoginContext)
  if (!context) {
    throw new Error('useLogin must be used within a LoginProvider')
  }
  return context
}
