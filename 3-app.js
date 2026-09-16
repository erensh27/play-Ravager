import { Chess } from './vendor/10-chess.js';
import { Chessboard, COLOR, INPUT_EVENT_TYPE, BORDER_TYPE } from 'https://cdn.jsdelivr.net/npm/cm-chessboard@8.14.0/src/Chessboard.js';
import { Markers, MARKER_TYPE } from 'https://cdn.jsdelivr.net/npm/cm-chessboard@8.14.0/src/extensions/markers/Markers.js';

const $=s=>document.querySelector(s), status=$('#gameStatus'), turnText=$('#turnText'), engineState=$('#engineState'), thinking=$('#thinking'), dot=$('#statusDot');
const sideSelect=$('#sideSelect'), strengthSelect=$('#strengthSelect'), sideLabel=$('#sideLabel'), movesEl=$('#moves');
let game=new Chess(), player='w', busy=true, worker=null, board, generation=0, selected=null, syncing=Promise.resolve();

function toast(text){const el=$('#toast');el.textContent=text;el.classList.add('show');clearTimeout(el._timer);el._timer=setTimeout(()=>el.classList.remove('show'),1500)}
function updateStatus(){
  let title='Your move', sub=game.turn()==='w'?'White to move':'Black to move';
  if(game.isCheckmate()){title=game.turn()===player?'Checkmate. Ravager wins.':'Checkmate. You win.';sub='Game over'}
  else if(game.isDraw()){title='Draw';sub='Game over'}
  else if(game.inCheck()) title='Check';
  if(busy&&!game.isGameOver()){title=worker?'Ravager is thinking':'Engine loading';sub='Please wait'}
  status.textContent=title;turnText.textContent=sub;
  $('#undo').disabled=busy||game.history().length<2;
  sideSelect.disabled=busy;strengthSelect.disabled=busy;
}
function renderMoves(){const hist=game.history();if(!hist.length){movesEl.innerHTML='<p>No moves yet.</p>';return}let html='';for(let i=0;i<hist.length;i+=2)html+=`<div class="move-row"><span class="move-no">${i/2+1}.</span><span>${hist[i]}</span><span>${hist[i+1]||''}</span></div>`;movesEl.innerHTML=html;movesEl.scrollTop=movesEl.scrollHeight}
function clearHints(){selected=null;board.removeLegalMovesMarkers?.();board.removeMarkers?.(MARKER_TYPE.framePrimary)}
function showHints(square){clearHints();selected=square;const moves=game.moves({square,verbose:true});if(moves.length){board.addMarker(MARKER_TYPE.framePrimary,square);board.addLegalMovesMarkers(moves)}return moves}
function setInput(){board.disableMoveInput();clearHints();if(!busy&&!game.isGameOver()&&game.turn()===player)board.enableMoveInput(inputHandler,player==='w'?COLOR.white:COLOR.black)}
function syncBoard(animated=false){syncing=syncing.catch(()=>{}).then(async()=>{await board.setPosition(game.fen(),animated);renderMoves();updateStatus();setInput()});return syncing}
function inputHandler(event){
  if(event.type===INPUT_EVENT_TYPE.movingOverSquare)return;
  if(event.type===INPUT_EVENT_TYPE.moveInputStarted){if(busy||game.turn()!==player)return false;return showHints(event.squareFrom).length>0}
  if(event.type===INPUT_EVENT_TYPE.validateMoveInput){
    const candidates=game.moves({square:event.squareFrom,verbose:true}).filter(m=>m.to===event.squareTo);
    if(!candidates.length)return false;
    clearHints();busy=true;board.disableMoveInput();updateStatus();
    if(candidates.some(m=>m.promotion)){event.animate=false;queueMicrotask(()=>showPromotion(event.squareFrom,event.squareTo));return false}
    const move=game.move({from:event.squareFrom,to:event.squareTo});
    if(!move){busy=false;updateStatus();setInput();return false}
    event.chessboard.state.moveInputProcess.then(async()=>{await syncBoard(true);if(!game.isGameOver())requestEngine();else{busy=false;await syncBoard()}});
    return true;
  }
  if(event.type===INPUT_EVENT_TYPE.moveInputCanceled){clearHints();setInput()}
  if(event.type===INPUT_EVENT_TYPE.moveInputFinished&&!event.legalMove){clearHints();setInput()}
}
function showPromotion(from,to){const modal=$('#promotion'),box=$('#promotionChoices');box.innerHTML='';const glyphs={q:'♛',r:'♜',b:'♝',n:'♞'};for(const type of ['q','r','b','n']){const button=document.createElement('button');button.textContent=glyphs[type];button.setAttribute('aria-label',`Promote to ${{q:'queen',r:'rook',b:'bishop',n:'knight'}[type]}`);button.onclick=async()=>{modal.hidden=true;game.move({from,to,promotion:type});await syncBoard(true);if(!game.isGameOver())requestEngine();else{busy=false;await syncBoard()}};box.append(button)}modal.hidden=false}
function requestEngine(){if(!worker)return;busy=true;thinking.hidden=false;setInput();updateStatus();worker.postMessage({type:'move',fen:game.fen(),time:+strengthSelect.value,generation})}
function startWorker(){
  generation++;const current=generation;if(worker)worker.terminate();worker=null;busy=true;thinking.hidden=true;engineState.textContent='LOADING ENGINE';dot.className='dot loading';updateStatus();
  const next=new Worker('./4-engine-worker.js',{type:'module'});worker=next;
  next.onmessage=async({data})=>{if(current!==generation||next!==worker||data.generation!==undefined&&data.generation!==generation)return;if(data.type==='ready'){engineState.textContent='NNUE READY · LOCAL';dot.className='dot';busy=false;await syncBoard();if(game.turn()!==player)requestEngine()}else if(data.type==='move'){if(data.move){const result=game.move({from:data.move.slice(0,2),to:data.move.slice(2,4),promotion:data.move[4]||'q'});if(!result){engineState.textContent='ENGINE STATE ERROR';dot.className='dot error';busy=false;thinking.hidden=true;await syncBoard();return}}busy=false;thinking.hidden=true;await syncBoard(true)}else if(data.type==='error'){engineState.textContent='ENGINE ERROR';dot.className='dot error';busy=false;thinking.hidden=true;status.textContent='Engine failed to load';turnText.textContent=data.message}};
  next.onerror=()=>{if(next!==worker)return;dot.className='dot error';engineState.textContent='ENGINE ERROR';busy=false;thinking.hidden=true;updateStatus()}
}
async function newGame(){generation++;if(worker){worker.terminate();worker=null}game=new Chess();player=sideSelect.value;sideLabel.textContent=player==='w'?'WHITE':'BLACK';busy=true;await board.setOrientation(player==='w'?COLOR.white:COLOR.black,false);await syncBoard();startWorker()}

board=new Chessboard($('#board'),{position:game.fen(),orientation:COLOR.white,responsive:true,assetsUrl:'https://cdn.jsdelivr.net/npm/cm-chessboard@8.14.0/assets/',style:{cssClass:'ravager-wood',showCoordinates:true,borderType:BORDER_TYPE.frame,pieces:{file:'pieces/standard.svg',tileSize:40},animationDuration:170},extensions:[{class:Markers,props:{autoMarkers:null}}]});
$('#newGame').onclick=newGame;sideSelect.onchange=newGame;$('#flip').onclick=async()=>{if(busy)return;clearHints();board.disableMoveInput();await board.setOrientation(board.getOrientation()===COLOR.white?COLOR.black:COLOR.white,true);setInput()};$('#undo').onclick=async()=>{if(busy)return;busy=true;setInput();game.undo();game.undo();await syncBoard(true);busy=false;await syncBoard()};$('#copyPgn').onclick=async()=>{await navigator.clipboard.writeText(game.pgn());toast('PGN copied')};
renderMoves();updateStatus();startWorker();
