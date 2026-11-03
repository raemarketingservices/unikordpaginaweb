import { useEffect, useState } from 'react';
import { api } from '@/lib/cloudflare';
import { toast } from 'sonner';

export function AppEditor({ resource = 'app-settings' }: { resource?: string }) {
  const [rows,setRows] = useState<Record<string,any>[]>([]);
  const [busy,setBusy] = useState('');
  const [error,setError] = useState('');
  const settings = resource === 'app-settings';
  const load = () => api<any>(`/api/admin/${resource}`).then(data=>{setRows(settings?[{id:'settings',...data}]:data);setError('');}).catch(e=>setError(e.message));
  useEffect(()=>{void load();},[resource]);
  const fields = settings ? ['headline','subtitle','banner','bannerCaption','primary','brand'] : resource === 'stores' ? ['name','description','category','location','logo','cover'] : resource === 'products' ? ['title','description','price','compare_at_price','image','category'] : resource === 'services' ? ['title','price_from','provider','coverage','image'] : ['name','icon','tipo','position'];
  async function save(row:Record<string,any>, changes:Record<string,any>) {
    setBusy(row['id']);
    try {await api(`/api/admin/${resource}${settings?'':`/${encodeURIComponent(row['id'])}`}`,{method:'PATCH',body:JSON.stringify(changes)});toast.success('Cambios guardados');window.dispatchEvent(new Event('unikord:appearance'));await load();}catch(e){toast.error(e instanceof Error?e.message:'No se pudo guardar');}finally{setBusy('');}
  }
  return <div className="grid gap-5"><p className="text-sm text-muted-foreground">{settings?'Edita la portada, el banner y los colores de la app. Los cambios se guardan en este servidor local.':'Administra el catálogo. Las tiendas nuevas requieren aprobación para publicar productos.'}</p>{error && <p role="alert" className="text-red-600">{error}</p>}{!rows.length&&!error&&<p>No hay registros.</p>}{rows.map(row=><form key={row['id']} className="card-uniko grid gap-4 p-5" onSubmit={e=>{e.preventDefault();const form=new FormData(e.currentTarget);const changes=Object.fromEntries(fields.map(key=>[key,['price','compare_at_price','price_from','position'].includes(key)?Number(form.get(key)):form.get(key)]));void save(row,changes);}}><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">{settings?'Apariencia de la app':row['name']||row['title']}</h2>{resource==='stores'&&<button type="button" disabled={busy===row['id']} onClick={()=>void save(row,{approved:row['approved']===false,verified:row['approved']===false})} className={`btn-base ${row['approved']===false?'btn-brand':'btn-outline'}`}>{row['approved']===false?'Aprobar tienda':'Suspender tienda'}</button>}</div>{resource==='stores'&&<p className="text-sm">Estado: {row['approved']===false?'Pendiente / suspendida':'Aprobada'} · {row['owner_name'] || 'Sin propietario'}</p>}<div className="grid gap-4 sm:grid-cols-2">{fields.map(key=><label key={`${row['id']}:${key}:${row[key]}`} className="grid gap-2 text-sm font-semibold">{({headline:'Título principal',subtitle:'Descripción',banner:'URL de la imagen del banner',bannerCaption:'Texto del banner',primary:'Color principal',brand:'Color de botones',name:'Nombre',description:'Descripción',category:'Categoría',location:'Ubicación',logo:'URL del logo',cover:'URL de portada',title:'Título',price:'Precio RD$',compare_at_price:'Precio anterior',image:'URL de imagen',price_from:'Precio desde',provider:'Proveedor',coverage:'Cobertura',icon:'Icono',tipo:'Tipo',position:'Posición'} as Record<string,string>)[key]}<input name={key} type={['primary','brand'].includes(key)?'color':['price','compare_at_price','price_from','position'].includes(key)?'number':'text'} min="0" step="any" defaultValue={row[key] ?? (key==='primary'?'#0033a0':key==='brand'?'#cc0033':'')} className="input-uniko min-h-11 text-base" /></label>)}</div><button disabled={busy===row['id']} className="btn-base btn-primary justify-self-start">{busy===row['id']?'Guardando…':'Guardar cambios'}</button></form>)}</div>;
}


