import { Link } from '@tanstack/react-router';
export function CompraAcceso({ redirect }: { redirect: string }) {
  return <div className="grid gap-4"><p className="text-sm text-muted-foreground">Para comprar este artículo, crea tu cuenta o inicia sesión. Después podrás continuar con tu compra.</p><Link to="/auth" search={{ modo: 'crear', redirect }} className="btn-base btn-brand min-h-12">Crear cuenta</Link><Link to="/auth" search={{ modo: 'entrar', redirect }} className="btn-base btn-primary min-h-12">Iniciar sesión</Link></div>;
}
