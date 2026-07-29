'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { label: 'Chat', href: '/chat', icon: '💬' },
  { label: 'Ejercicios', href: '/ejercicios', icon: '📝' },
  { label: 'Progreso', href: '/progreso', icon: '📊' },
  { label: 'Evaluación', href: '/evaluacion', icon: '✅' },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 pb-safe-bottom"
      role="navigation"
      aria-label="Navegación principal"
    >
      <ul className="flex justify-around items-center h-16 max-w-mobile mx-auto px-2">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;

          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={`
                  relative
                  flex flex-col items-center justify-center
                  min-h-touch min-w-touch
                  py-2 px-1
                  rounded-xl
                  text-base
                  transition-colors duration-200
                  ${isActive
                    ? 'text-primary-800 bg-primary-100 font-semibold'
                    : 'text-gray-500 font-medium hover:text-primary-700 hover:bg-gray-50'
                  }
                `}
                aria-current={isActive ? 'page' : undefined}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <span
                    className="absolute top-0 left-1/4 right-1/4 h-[3px] rounded-full bg-primary-600"
                    aria-hidden="true"
                  />
                )}
                <span className="text-xl leading-none mb-1" aria-hidden="true">
                  {tab.icon}
                </span>
                <span className="text-base leading-tight">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
