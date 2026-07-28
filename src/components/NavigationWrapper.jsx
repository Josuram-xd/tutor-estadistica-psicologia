'use client';

import { usePathname } from 'next/navigation';
import Navigation from './Navigation';

export default function NavigationWrapper() {
  const pathname = usePathname();

  // No mostrar navegación en la página de login (ruta raíz)
  if (pathname === '/') {
    return null;
  }

  return <Navigation />;
}
