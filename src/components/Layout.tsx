import { Outlet, Link, useLocation } from 'react-router';
import { LayoutDashboard, Smartphone, Package, CalendarDays, Settings, Truck, Users } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

export function Layout() {
  const location = useLocation();
  const { user, profile } = useAuth();
  
  const firstName = profile?.first_name || '';
  const lastName = profile?.last_name || '';
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}` || user?.email?.charAt(0).toUpperCase() || '?';

  const navItems = [
    { name: 'Régie', href: '/', icon: LayoutDashboard },
    { name: 'Terrain (Mobile)', href: '/mobile', icon: Smartphone },
    { name: 'Parc Matériel', href: '/inventory', icon: Package },
    { name: 'Véhicules', href: '/vehicles', icon: Truck },
    { name: 'Planning', href: '/planning', icon: CalendarDays },
    { name: 'Personnel', href: '/staff', icon: Users },
    { name: 'Paramètres', href: '/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-200 bg-white">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-white rounded-sm"></div>
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-800">EventFlow</span>
        </div>
        
        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto mt-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href || (location.pathname === '/' && item.href === '/'); // Handle index correctly if needed, but react-router location is exact for '/'
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md font-medium transition-colors",
                  isActive 
                    ? "bg-blue-50 text-blue-700" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <item.icon className={cn("w-4 h-4", isActive ? "text-blue-600" : "text-slate-400")} />
                {item.name}
              </Link>
            )
          })}
        </nav>
        
        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-300 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold shadow-sm uppercase overflow-hidden">
               {profile?.avatar_url ? <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : initials}
            </div>
            <div className="text-sm">
               <p className="font-semibold">{firstName} {lastName}</p>
               <p className="text-[10px] text-slate-500 uppercase tracking-wide">{profile?.role || 'Utilisateur'}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col relative">
        {/* Header */}
        <header className="hidden md:flex h-16 bg-white border-b border-slate-200 items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">Logistique {`>`} </span>
            <h2 className="text-lg font-semibold text-slate-800">Dashboard Live</h2>
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase">Sync Temps Réel</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full border-2 border-white bg-blue-400"></div>
              <div className="w-8 h-8 rounded-full border-2 border-white bg-amber-400"></div>
              <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-medium text-slate-600">+4</div>
            </div>
            <Link to="/planning" className="bg-indigo-600 px-4 py-2 text-white font-medium text-sm rounded shadow-sm hover:bg-indigo-700 transition">
              + Nouvelle Mission
            </Link>
          </div>
        </header>

        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
              <div className="w-3 h-3 border-2 border-white rounded-[2px]"></div>
            </div>
            <span className="font-bold text-lg text-slate-800 tracking-tight">EventFlow</span>
          </div>
          <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-600 border border-slate-300 uppercase overflow-hidden">
            {profile?.avatar_url ? <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : initials}
          </div>
        </header>

        <div className="flex-1 overflow-auto flex flex-col">
          <Outlet />
        </div>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around pb-safe z-20">
          {navItems.slice(0, 3).map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 p-3 flex-1 text-[10px] font-medium transition-colors",
                  isActive ? "text-blue-600" : "text-slate-500"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </main>
    </div>
  );
}
