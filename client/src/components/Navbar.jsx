import { Link, useNavigate, useLocation } from 'react-router-dom'

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()

  const logout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  const links = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/subjects',  label: 'Subjects' },
    { to: '/exams',     label: 'Exams' },
    { to: '/tasks',     label: 'Tasks' },
    { to: '/progress',  label: 'Progress' },
  ]

  return (
    <nav className="bg-white border-b border-gray-100 px-8 py-4 flex justify-between items-center sticky top-0 z-50">
      <div className="flex items-center gap-10">
        <span className="font-bold text-blue-600 text-lg tracking-tight"> StudyPlanner</span>
        <div className="flex gap-6">
          {links.map(l => (
            <Link
              key={l.to}
              to={l.to}
              className={`text-sm font-medium transition-colors ${
                location.pathname === l.to
                  ? 'text-blue-600 border-b-2 border-blue-600 pb-1'
                  : 'text-gray-500 hover:text-blue-600'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
      <button
        onClick={logout}
        className="text-sm text-gray-400 hover:text-red-500 transition-colors"
      >
        Log out
      </button>
    </nav>
  )
}