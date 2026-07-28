'use client';

import { usePathname } from 'next/navigation';

export default function ContentWrapper({ children }) {
  const pathname = usePathname();

  // No agregar padding en la pagina de login (ruta raiz)
  // ya que no muestra la barra de navegacion
  const isLoginPage = pathname === '/';

  return (
    <main className={isLoginPage ? '' : 'pb-20'}>
      {/* key={pathname} re-triggers the fade-in animation on each navigation */}
      <div
        key={pathname}
        className={isLoginPage ? '' : 'animate-page-fade-in'}
      >
        {children}
      </div>
    </main>
  );
}
