import Link from 'next/link';

export default function Sidebar({ sidebarOpen }) {
  if (!sidebarOpen) return null;
  return (
    <div className="w-64 bg-white border-r min-h-screen p-4 hidden md:block">
      <ul className="space-y-4">
        <li>
          <Link href="/dashboard" className="text-gray-700 hover:text-blue-600 font-medium">Dashboard</Link>
        </li>
      </ul>
    </div>
  );
}