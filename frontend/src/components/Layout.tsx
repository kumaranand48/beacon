import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  return (
    <div className="min-h-screen bg-surface-bg">
      <Sidebar />
      <main className="ml-[260px] p-8 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
