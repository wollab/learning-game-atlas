export function luminance(hex){
 const rgb=String(hex).replace(/^#/,'');if(!/^[\da-f]{6}$/i.test(rgb))throw Error('Expected six-digit hex color');
 const v=[0,2,4].map(i=>parseInt(rgb.slice(i,i+2),16)/255).map(c=>c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4);
 return .2126*v[0]+.7152*v[1]+.0722*v[2];
}
export function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
export function readableInk(background){const choices=['#FFFFFF','#192C4C','#000000'];return choices.find(c=>contrast(background,c)>=4.5)??choices.reduce((a,b)=>contrast(background,a)>contrast(background,b)?a:b);}
