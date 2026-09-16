import createRavager from './engine/ravager.js';
let engine;
const ready = (async () => {
  engine = await createRavager({ locateFile: p => `./engine/${p}` });
  if (!engine._ravager_init() || !engine._ravager_nnue_ready()) throw new Error('Embedded NNUE failed to load');
  postMessage({ type: 'ready' });
})();
function withString(text, fn) {
  const size = engine.lengthBytesUTF8(text) + 1;
  const ptr = engine._malloc(size);
  try { engine.stringToUTF8(text, ptr, size); return fn(ptr); }
  finally { engine._free(ptr); }
}
onmessage = async ({ data }) => {
  try {
    await ready;
    if (data.type === 'move') {
      const result = withString(data.fen, ptr => {
        const movePtr = engine._ravager_bestmove(ptr, data.time);
        const move = engine.UTF8ToString(movePtr);
        const evaluation = engine._ravager_eval(ptr);
        return { move, evaluation };
      });
      postMessage({ type: 'move', ...result });
    }
  } catch (error) { postMessage({ type: 'error', message: error.message }); }
};
