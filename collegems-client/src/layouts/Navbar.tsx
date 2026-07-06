import {
  LogIn,
  UserPlus,
  School,
  Moon,
  Sun,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import GlobalSearch from "./GlobalSearch";
import ThemeSwitcher from "../components/ThemeSwitcher";

export default function Navbar(){
    const navigate = useNavigate();
    const { darkMode, toggleTheme } = useTheme();

    return(
        <>
            <nav className="sticky top-0 p-1 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <div className="flex items-center">
                    <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                        <School className="w-5 h-7 text-white" />
                    </div>
                    <span className="text-2xl font-semibold text-gray-900 dark:text-white cursor-pointer" onClick={() => navigate('/')}>
                        College<span className="text-blue-600">Portal</span>
                    </span>
                    </div>

                    {/* Global Search */}
                    <div className="flex-1 max-w-xl mx-8 hidden md:block">
                        <GlobalSearch />
                    </div>

                    {/* Right side buttons */}
                    <div className="flex items-center space-x-3">
                    <button
                        onClick={() => navigate("/calendar")}
                        className="px-4 py-2 text-sm font-medium text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                        >
                        📅 Calendar
                    </button>
                    <ThemeSwitcher />
                    <button
                        onClick={() => navigate("/login")}
                        className="px-4 py-2 text-xl font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors flex items-center gap-2"
                    >
                        <LogIn size={16} />
                        Sign In
                    </button>
                    <button
                        onClick={() => navigate("/register")}
                        className="px-4 py-2 text-md font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                        <UserPlus size={16} />
                        Register
                    </button>
                    </div>
                </div>
                </div>
            </nav>
        </>

    )
}