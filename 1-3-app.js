import { Chess } from './vendor/10-chess.js';
import { Chessboard, COLOR, INPUT_EVENT_TYPE, BORDER_TYPE } from 'https://cdn.jsdelivr.net/npm/cm-chessboard@8.14.0/src/Chessboard.js';

const status=document.querySelector('#gameStatus'), turnText=document.querySelector('#turnText'), engineState=document.querySelector('#engineState'), thinking=document.querySelector('#thinking'), dot=document.querySelector('#statusDot');
const sideSelect=document.querySelector('#sideSelect'), strengthSelect=document.querySelector('#strengthSelect'), sideLabel=document.querySelector('#sideLabel'), movesEl=document.querySelector('#moves');
let game=new Chess(), player='w', busy=true, worker, board;

function toast(t){const e=document.querySelector('#toast');e.textContent=t;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),1800)}
function updateStatus(){let title='Your move',sub=game.turn()==='w'?'White to move':'Black to move';if(game.isCheckmate()){title=game.turn()===player?'Checkmate. Ravager wins.':'Checkmate. You win.';sub='Game over'}else if(game.isDraw()){title='Draw';sub='Game over'}else if(game.inCheck())title='Check';if(busy&&!game.isGameOver()){title=worker?'Ravager is thinking':'Engine loading...';sub='Please wait'}status.textContent=title;turnText.textContent=sub;document.querySelector('#undo').disabled=busy||game.history().length<2}
function renderMoves(){const hist=game.history();if(!hist.length){movesEl.innerHTML='<p>No moves yet.</p>';return}let h='';for(let i=0;i<hist.length;i+=2)h+=`<div class="move-row"><span class="move-no">${i/2+1}.</span><span>${hist[i]}</span><span>${hist[i+1]||''}</span></div>`;movesEl.innerHTML=h;movesEl.scrollTop=movesEl.scrollHeight}
function setInput(){board.disableMoveInput();if(!busy&&!game.isGameOver()&&game.turn()===player)board.enableMoveInput(inputHandler,player==='w'?COLOR.white:COLOR.black)}
async function syncBoard(animated=false){await board.setPosition(game.fen(),animated);renderMoves();updateStatus();setInput()}
function inputHandler(event){
  if(event.type===INPUT_EVENT_TYPE.moveInputStarted){if(busy||game.turn()!==player)return false;return game.moves({square:event.squareFrom,verbose:true}).length>0}
  if(event.type===INPUT_EVENT_TYPE.validateMoveInput){
    const promotions=game.moves({square:event.squareFrom,verbose:true}).filter(m=>m.to===event.squareTo&&m.promotion);
    if(promotions.length){event.animate=false;showPromotion(event.squareFrom,event.squareTo);return false}
    const move=game.move({from:event.squareFrom,to:event.squareTo});
    if(!move)return false;
    event.chessboard.state.moveInputProcess.then(async()=>{await syncBoard(true);if(!game.isGameOver())requestEngine()});
    return true;
  }
  if(event.type===INPUT_EVENT_TYPE.moveInputFinished&&!event.legalMove) setInput();
}
function showPromotion(from,to){const modal=document.querySelector('#promotion'),box=document.querySelector('#promotionChoices');box.innerHTML='';const glyphs={q:'♛',r:'♜',b:'♝',n:'♞'};for(const type of ['q','r','b','n']){const b=document.createElement('button');b.textContent=glyphs[type];b.onclick=async()=>{modal.hidden=true;game.move({from,to,promotion:type});await syncBoard(true);if(!game.isGameOver())requestEngine()};box.append(b)}modal.hidden=false}
function requestEngine(){busy=true;thinking.hidden=false;setInput();updateStatus();worker.postMessage({type:'move',fen:game.fen(),time:+strengthSelect.value})}
function startWorker(){busy=true;worker=new Worker('./4-engine-worker.js',{type:'module'});worker.onmessage=async({data})=>{if(data.type==='ready'){engineState.textContent='NNUE READY · LOCAL';dot.className='dot';busy=false;await syncBoard();if(game.turn()!==player)requestEngine()}else if(data.type==='move'){if(data.move)game.move({from:data.move.slice(0,2),to:data.move.slice(2,4),promotion:data.move[4]||'q'});busy=false;thinking.hidden=true;await syncBoard(true)}else if(data.type==='error'){engineState.textContent='ENGINE ERROR';dot.className='dot error';busy=false;thinking.hidden=true;status.textContent='Engine failed to load';turnText.textContent=data.message}};worker.onerror=()=>{dot.className='dot error';engineState.textContent='ENGINE ERROR';busy=false;updateStatus()}}
async function newGame(){game=new Chess();player=sideSelect.value;sideLabel.textContent=player==='w'?'WHITE':'BLACK';await board.setOrientation(player==='w'?COLOR.white:COLOR.black,false);await syncBoard();if(worker&&game.turn()!==player)requestEngine()}

board=new Chessboard(document.querySelector('#board'),{position:game.fen(),orientation:COLOR.white,responsive:true,assetsUrl:'https://cdn.jsdelivr.net/npm/cm-chessboard@8.14.0/assets/',style:{cssClass:'ravager-wood',showCoordinates:true,borderType:BORDER_TYPE.frame,pieces:{file:'pieces/standard.svg',tileSize:40},animationDuration:220}});
document.querySelector('#newGame').onclick=newGame;sideSelect.onchange=newGame;document.querySelector('#flip').onclick=async()=>board.setOrientation(board.getOrientation()===COLOR.white?COLOR.black:COLOR.white,true);document.querySelector('#undo').onclick=async()=>{if(busy)return;game.undo();game.undo();await syncBoard(true)};document.querySelector('#copyPgn').onclick=async()=>{await navigator.clipboard.writeText(game.pgn());toast('PGN COPIED')};
renderMoves();updateStatus();startWorker();
