export function campusActor(a:any,campus?:string){
 if(campus!==undefined&&!['PUTRA','PUTRI'].includes(campus))throw new Error('Lingkungan tidak valid.');
 const putri=campus==='PUTRI';const user=putri?a.simkaPutriUser:a.simkaUser;
 if(!user)throw Object.assign(new Error('Akun belum mempunyai penugasan lingkungan dan unit ini.'),{status:403});
 return {...a,campus:putri?'PUTRI':'PUTRA',schema:putri?'simka_putri':'simka',units:putri?a.putri_units:a.units,simkaUser:user};
}
