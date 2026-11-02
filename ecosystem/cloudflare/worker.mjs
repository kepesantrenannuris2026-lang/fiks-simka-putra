// Assets are served first; this Worker handles only missing application routes.
// Never cache API responses, log credentials or place database keys here.
export default {
 async fetch(request, env) {
  const url=new URL(request.url);
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
  const module=['simka','simka-putri','yaumiyyah'].find(id=>url.pathname===`/${id}`||url.pathname.startsWith(`/${id}/`));
  if(module && !url.pathname.split('/').at(-1).includes('.')){
   url.pathname=`/${module}/index.html`;
   return env.ASSETS.fetch(new Request(url,request));
  }
  return new Response('Halaman tidak ditemukan',{status:404,headers:{'Content-Type':'text/plain; charset=utf-8','X-Content-Type-Options':'nosniff'}});
 }
};
