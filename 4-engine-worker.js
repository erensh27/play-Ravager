import createRavager from './engine/8-ravager.js';
let engine;
const ready = (async () => {
  engine = await createRavager({ locateFile: () => './engine/9-ravager.wasm' });
  if (!engine._ravager_init() || !engine._ravager_nnue_ready()) throw new Error('Embedded NNUE failed to load');
  postMessage({ type: 'ready' });
})();
function withString(text, fn) { const size=engine.lengthBytesUTF8(text)+1, ptr=engine._malloc(size); try { engine.stringToUTF8(text,ptr,size); return fn(ptr); } finally { engine._free(ptr); } }
onmessage=async({data})=>{try{await ready;if(data.type==='move'){const result=withString(data.fen,ptr=>{const move=engine.UTF8ToString(engine._ravager_bestmove(ptr,data.time));return{move,evaluation:engine._ravager_eval(ptr)}});postMessage({type:'move',...result})}}catch(error){postMessage({type:'error',message:error.message})}};
